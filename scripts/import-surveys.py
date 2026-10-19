"""Offline, deterministic import of pinned CC BY, CC0 and OGL survey evidence.

No network, generated counts, percentage presets, cross-question inference, or
renormalization of multiple-selection columns. Editorial maps are exhaustive
one-to-one labels for single-response items. Run --check in CI.
"""
from __future__ import annotations

import argparse
from collections import Counter
import csv
import hashlib
import html
import io
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from survey_evidence import ods_tables, fingerprint, reserve_unique_days

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / 'content/surveys'
VERSION = 'surveys-v2-unique'
EXPECTED_ROWS = {'comma-survey': 1129, 'flying-etiquette-survey': 1040,
                 'food-world-cup': 1373, 'star-wars-survey': 1186,
                 'steak-survey': 550, 'thanksgiving-2015': 1058}
METADATA_SOURCES = {'star-wars-survey', 'steak-survey'}


def load_table(blob: bytes, metadata: bool = False, id_column: int | None = 0):
    try:
        text = blob.decode('utf-8-sig')
        encoding = 'utf-8-sig'
    except UnicodeDecodeError:
        text = blob.decode('cp1252')  # strict: never silently replace bytes
        encoding = 'cp1252'
    rows = list(csv.reader(io.StringIO(text, newline='')))
    if not rows or not rows[0]:
        raise ValueError('Empty CSV')
    header = rows.pop(0)
    if any(len(row) != len(header) for row in rows):
        raise ValueError('CSV width drift')
    subheader = None
    if metadata:
        subheader = rows.pop(0)
        if subheader[0] != '' or subheader[1] != 'Response':
            raise ValueError('Unexpected metadata row')
    if id_column is not None:
        ids = [row[id_column] for row in rows]
        if any(not value.isdigit() for value in ids) or len(set(ids)) != len(ids):
            raise ValueError('Invalid or duplicate respondent IDs')
    elif len({tuple(row) for row in rows}) != len(rows):
        raise ValueError('Duplicate anonymous response rows require explicit review')
    return header, subheader, rows, encoding


def count_item(rows, column, options, documented_offered_values=None):
    counts = Counter(row[column].strip() for row in rows)
    missing = counts.pop('', 0)
    raw = [o['raw'] for o in options]
    labels = [o['label'] for o in options]
    if len(raw) != len(set(raw)) or len(labels) != len(set(labels)):
        raise ValueError('Option mappings must be one-to-one')
    if documented_offered_values is not None:
        if set(raw) != set(documented_offered_values) or not set(counts).issubset(set(raw)):
            raise ValueError('Recorded responses do not match the documented offered scale')
    elif set(counts) != set(raw):
        raise ValueError(f'Unmapped or invented responses: {set(counts) ^ set(raw)}')
    base = sum(counts.values())
    if base < 200:
        raise ValueError('Fewer than 200 valid answers; editorial review required')
    if base + missing != len(rows):
        raise ValueError('Denominator reconciliation failed')
    groups = [{
        'name': o['label'], 'pct': 100 * counts[o['raw']] / base,
        'aliases': o['aliases'],
    } for o in options]
    # Keep order independent of counts, so choice position does not leak popularity.
    return groups, counts, base, missing


def json_text(value):
    return json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n'


def build():
    manifest = json.loads((SOURCE_ROOT / 'checksums.json').read_text())
    commit = manifest['commit']
    for item in manifest['files']:
        digest = hashlib.sha256((SOURCE_ROOT / item['path']).read_bytes()).hexdigest()
        if digest != item['sha256']:
            raise ValueError(f'Source checksum mismatch: {item["path"]}')
    editorial = json.loads((ROOT / 'content/survey-editorial.json').read_text())
    sources = {s['id']: s for s in editorial['sources']}
    tables = {}
    wordings = {}
    for sid, source in sources.items():
        blob = (SOURCE_ROOT / source['file']).read_bytes()
        if source.get('format') == 'ods':
            tables[sid] = ods_tables(blob)
        else:
            tables[sid] = load_table(blob, sid in METADATA_SOURCES, source.get('idColumn', 0))
            expected = source.get('expectedRows', EXPECTED_ROWS.get(sid))
            if len(tables[sid][2]) != expected:
                raise ValueError(f'Respondent count drift: {sid}')
            if source.get('wordingFile'):
                import csv
                with (SOURCE_ROOT / source['wordingFile']).open(newline='') as f:
                    wordings[sid] = list(csv.DictReader(f))
                if len(wordings[sid]) != len(tables[sid][0]):
                    raise ValueError('Question dictionary width mismatch')
    questions, ledger = [], []
    seen, concepts, wording_keys = set(), set(), set()
    for spec in editorial['questions']:
        sid = spec['source']
        source = sources[sid]
        basis = spec.get('basis', 'responses')
        option_evidence = []
        coordinates = None
        if source.get('format') == 'ods':
            sheet = tables[sid][spec['sheet']]
            original = spec['originalWording']
            subheading = None
            col = None
            encoding = 'ODS/XML'
            if basis == 'published-weighted':
                row = sheet[spec['row']]
                header = sheet[spec['headerRow']]
                preceding = [r for r, cells in sheet.items() if r < spec['row'] and len(cells) > 1 and cells[1]['text'] == 'NTAS Wave']
                if not preceding or max(preceding) != spec['headerRow']:
                    raise ValueError('Wrong response header block for spreadsheet item')
                if row[0]['text'] != original:
                    raise ValueError('Spreadsheet question drift')
                if header[0]['text'] != 'NTAS Question':
                    subheading = original
                    original = header[0]['text']
                base = int(float(row[spec['baseColumn']]['value']))
                respondent_count = int(float(row[spec['totalColumn']]['value']))
                missing = respondent_count - base
                groups = []
                for option in spec['options']:
                    c = option['column']
                    label_header = sheet[option.get('headerRow', spec['headerRow'])]
                    if label_header[c]['text'] != option['raw']:
                        raise ValueError('Spreadsheet response label drift')
                    context = option.get('contextCell')
                    if context and sheet[context['row']][context['column']]['text'] != context['text']:
                        raise ValueError('Response context header drift')
                    pct = float(row[c]['value'])
                    groups.append({'name': option['label'], 'pct': pct, 'aliases': option['aliases']})
                    option_evidence.append({'raw': ((context['text'] + ' / ') if context else '') + option['raw'], 'label': option['label'], 'count': None, 'pct': pct,
                                            'cell': f"{spec['sheet']}!R{spec['row']+1}C{c+1}",
                                            'labelCell': f"{spec['sheet']}!R{option.get('headerRow', spec['headerRow'])+1}C{c+1}"})
                if abs(sum(g['pct'] for g in groups) - 100) > 1e-7:
                    raise ValueError('Weighted choices do not form one complete distribution; never renormalize')
                coordinates = f"{spec['sheet']}, data row {spec['row']+1}, labels row {spec['headerRow']+1} (1-based)"
                denominator = 'Official weighted distribution among item respondents. n is an unweighted respondent base; not-asked/skipped records are excluded. Counts are unavailable per weighted option and are not inferred.'
                transformation = 'Official numeric percentage cells copied at stored precision, with faithful display label adaptations. No renormalization, reverse scoring, or person counts inferred.'
            elif basis == 'published-counts':
                options = spec['options']
                bases = {int(sheet[o['row']][spec['baseColumn']]['text'].replace(',', '')) for o in options}
                if len(bases) != 1:
                    raise ValueError('Mixed response bases in a distribution')
                base = bases.pop(); respondent_count = None; missing = None
                groups = []
                for option in options:
                    row = sheet[option['row']]
                    if row[0]['text'] != original or row[spec['labelColumn']]['text'] != option['raw']:
                        raise ValueError('Published count label drift')
                    count = int(row[spec['countColumn']]['text'].replace(',', ''))
                    pct = 100 * count / base
                    groups.append({'name': option['label'], 'pct': pct, 'aliases': option['aliases']})
                    option_evidence.append({'raw': option['raw'], 'label': option['label'], 'count': count, 'pct': pct,
                                            'cell': f"{spec['sheet']}!R{option['row']+1}C{spec['countColumn']+1}"})
                if sum(o['count'] for o in option_evidence) != base:
                    raise ValueError('Incomplete or multiple-response counts; never turn them into a choice distribution')
                coordinates = f"{spec['sheet']}, option rows " + ', '.join(str(o['row'] + 1) for o in options) + ' (1-based)'
                denominator = 'Unweighted valid-response base supplied by the source table. Published option counts reconcile exactly with that base. Missing outside the table base is not quantified.'
                transformation = 'Unweighted counts from official tables divided by the unweighted item base. Grouped totals excluded. Weighted headline percentages are not used.'
            else:
                raise ValueError('Unsupported aggregate basis')
            item_identity = (sid, spec['sheet'], original, subheading)
        else:
            col = spec['column']
            header, subheader, rows, encoding = tables[sid]
            groups, counts, base, missing = count_item(rows, col, spec['options'], spec.get('documentedOfferedValues'))
            respondent_count = len(rows)
            original = next(header[j] for j in range(col, -1, -1) if header[j])
            subheading = subheader[col] if subheader else None
            if sid in wordings:
                if wordings[sid][col]['short'] != header[col]:
                    raise ValueError('Original/short question mapping mismatch')
                original = wordings[sid][col]['original']
            item_identity = (sid, col)
            option_evidence = [{'raw': o['raw'], 'label': o['label'], 'count': counts[o['raw']], 'pct': 100 * counts[o['raw']] / base} for o in spec['options']]
            denominator = 'Nonblank answers to this exact single-response item. Missing/skipped is excluded, never treated as No.'
            transformation = 'Faithful prompt/label adaptations, no merging or inferred responses. pct = 100 × count / validAnswers. Intermediate scale labels are not invented. Explicitly documented offered choices with no recorded selections retain a true zero. Scores use the unrounded fraction; display rounds to one decimal.'
        if item_identity in seen:
            raise ValueError('Duplicated source item')
        seen.add(item_identity)
        if base < 200 or (missing is not None and missing < 0) or len(groups) < 2 or any(not g['name'].strip() or not 0 <= g['pct'] <= 100 for g in groups):
            raise ValueError('Invalid or insufficient item evidence')
        concept = spec.get('conceptKey', sid + ':' + str(col))
        wording_key = fingerprint(original + (' / ' + subheading if subheading else ''))
        if concept in concepts or wording_key in wording_keys:
            raise ValueError('Duplicate original question wording or editorial concept')
        concepts.add(concept); wording_keys.add(wording_key)
        year = spec.get('year', source['year'])
        url = source.get('url', f'https://github.com/fivethirtyeight/data/blob/{commit}/{source["file"]}')
        ref = {'id': sid, 'title': source['title'], 'year': year, 'n': base, 'url': url, 'basis': basis}
        population_hint = ' · England' if source.get('format') == 'ods' else ' · Slovak sample' if sid == 'young-people-2013' else ''
        precision_hint = ' · weighted shares' if basis == 'published-weighted' else ''
        q = {'id': spec['id'], 'category': spec['category'], 'q': spec['prompt'],
             'sub': f'{year}{population_hint} reference group · n={base:,}{precision_hint}. {spec["context"]}',
             'groups': groups, 'source': ref, 'conceptKey': concept, 'wordingFingerprint': wording_key}
        questions.append(q)
        ledger.append({'questionId': q['id'], 'conceptKey': concept, 'wordingFingerprint': wording_key,
                       'source': ref, 'sourceCommit': commit if sid in EXPECTED_ROWS else None,
                       'columnIndex': col, 'coordinates': coordinates, 'originalWording': original,
                       'sourceEvidence': [f for f in manifest['files'] if f['path'] in {source['file'], source.get('wordingFile'), str(Path(source['file']).parent / 'README.md'), *source.get('evidenceFiles', [])}],
                       'originalSubheading': subheading, 'encoding': encoding,
                       'respondentCount': respondent_count, 'validAnswers': base, 'missingAnswers': missing,
                       'missingNote': 'For published tables, omissions outside the stated item base may be unknown.' if basis == 'published-counts' else 'Source records minus the valid item base.',
                       'population': source['population'], 'fieldDate': spec.get('fieldDate', source.get('fieldDate')),
                       'dateNote': 'Historical item year; exact field date unknown unless stated. Never current player votes.',
                       'weighting': source['weighting'], 'denominator': denominator, 'transformation': transformation,
                       'options': option_evidence})
    if len({q['id'] for q in questions}) != len(questions):
        raise ValueError('Duplicate question ID')
    registry_path = ROOT / 'content/publication-registry.json'
    registry = json.loads(registry_path.read_text()) if registry_path.exists() else {'version': 1, 'firstDay': '2026-10-19', 'days': []}
    registry = reserve_unique_days(questions, registry)
    days = [{'number': d['number'], 'day': d['day'], 'questionIds': [i['questionId'] for i in d['items']]} for d in registry['days']]
    scheduled = [qid for d in days for qid in d['questionIds']]
    if len(scheduled) != len(set(scheduled)):
        raise ValueError('Question reuse is forbidden')
    catalog = json.loads((ROOT / 'content/source-catalog.json').read_text())
    approved_in_catalog = sum(c['approvedQuestions'] for c in catalog['collections'])
    if approved_in_catalog != len(questions):
        raise ValueError('Source-catalog approved counts do not match the verified bank')
    categories = Counter(q['category'] for q in questions)
    audit = {'version': VERSION, 'sourceCommit': commit, 'yearGoal': 1825,
             'verifiedQuestions': len(questions), 'remainingToYearGoal': max(0, 1825 - len(questions)),
             'scheduledDays': len(days), 'scheduledSlots': len(scheduled), 'distinctDailySets': len(days),
             'repeatedQuestionSlots': 0, 'unscheduledReserve': len(questions) - len(scheduled),
             'firstScheduledDay': days[0]['day'], 'lastScheduledDay': days[-1]['day'],
             'categories': dict(categories), 'minValidAnswers': min(q['source']['n'] for q in questions),
             'sourceCount': len(sources), 'currentOrRepresentativeClaim': False,
             'limits': ['Historical source reference groups, not current Swerve player votes.',
                        'Count-based and published-weighted items are distinguished; weights are never used to invent respondent counts.',
                        'One survey item/concept/original wording may be reserved once only. Rewordings or new-year copies are not new inventory.',
                        'Checkbox distributions, demographic variants and incomplete answer scales are excluded from this batch.',
                        'The verified inventory remains below the 1825-question year goal.']}
    esc = html.escape
    credits = ['<!doctype html><html lang="en"><meta charset="utf-8">',
               '<meta name="viewport" content="width=device-width, initial-scale=1">',
               '<title>Swerve · Data credits</title>',
               '<style>body{font:17px/1.6 system-ui;background:#111320;color:#f6f7fc;max-width:760px;padding:24px;margin:auto}a{color:#7bdec3}details{border-bottom:1px solid #35394b;padding:16px 0}summary{cursor:pointer}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:4px;border-bottom:1px solid #35394b}code{overflow-wrap:anywhere}small{color:#a7aabb}</style>',
               '<a href="./">← Swerve</a><h1>Data credits</h1>',
               '<p>Historical source reference groups, not live Swerve player votes. Each item retains its original answer scale, population and base. Shares are either recorded-response frequencies or the source’s published weighted estimates, as stated below. Missing answers are excluded, never converted to No. Weighted percentages are not person counts.</p>',
               '<p>Swerve adapts wording and labels for play. Display rounds to one decimal; scoring uses stored source precision. No source endorsement is implied.</p>',
               f'<p>{len(questions)} verified unique questions; {len(days)} complete nonrepeating daily sets, with {len(questions)-len(scheduled)} spare questions. One-year target: 1,825. The details below contain answer spoilers.</p>',
               '<h2>Source credits</h2>']
    for source in sources.values():
        attribution = source.get('attribution', 'FiveThirtyEight: ' + source['title'])
        license_url = source.get('licenseUrl', 'https://creativecommons.org/licenses/by/4.0/')
        license_name = source.get('license', 'CC BY 4.0')
        url = source.get('url', f'https://github.com/fivethirtyeight/data/tree/{commit}/' + source['id'])
        credits.append(f'<p>{esc(attribution)} · <a href="{esc(url)}">Source</a> · <a href="{esc(license_url)}">{esc(license_name)}</a>.</p>')
    for item, q in zip(ledger, questions):
        s = item['source']
        wording = item['originalWording'] + (' / ' + item['originalSubheading'] if item['originalSubheading'] else '')
        credits += [f'<details id="{esc(q["id"])}"><summary>{esc(q["q"])}</summary>',
                    f'<p>{s["year"]} · n={s["n"]:,} valid item responses. {esc(s["basis"])}. ',
                    f'<a href="{esc(s["url"])}">Original data</a> · {esc(item["coordinates"] or ("column " + str(item["columnIndex"]) + " (zero-based)"))}.</p>',
                    f'<p>Original wording: {esc(wording)}</p><p>{esc(item["population"])} {esc(item["weighting"])}</p>',
                    '<table><thead><tr><th>Response</th><th>Count</th><th>Share</th></tr></thead><tbody>']
        credits.extend(f'<tr><td>{esc(o["label"])}</td><td>{o["count"] if o["count"] is not None else "Not a raw count"}</td><td>{o["pct"]:.1f}%</td></tr>' for o in item['options'])
        credits += ['</tbody></table>', f'<small>{esc(item["transformation"])}</small></details>']
    credits.append('<script>function openSource(){const target=document.getElementById(location.hash.slice(1));if(target instanceof HTMLDetailsElement){target.open=true;target.scrollIntoView();}}openSource();addEventListener("hashchange",openSource);</script></html>\n')
    return {
        'content/publication-registry.json': json_text(registry),
        'src/data/prepared-questions.json': json_text(questions),
        'src/data/challenge-calendar.json': json_text(days),
        'docs/content/survey-ledger.json': json_text(ledger),
        'docs/content/survey-audit.json': json_text(audit),
        'public/data-credits.html': '\n'.join(line.rstrip() for line in credits),
    }, audit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    outputs, audit = build()
    drift = []
    for relative, text in outputs.items():
        p = ROOT / relative
        if args.check:
            if not p.exists() or p.read_text() != text:
                drift.append(relative)
        else:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text)
    if drift:
        raise SystemExit('Generated content drift; run npm run content:import: ' + ', '.join(drift))
    print(f'{"Verified" if args.check else "Imported"} {audit["verifiedQuestions"]} real questions from {audit["sourceCount"]} pinned datasets; '
          f'{audit["scheduledDays"]} days with NO repeats; {audit["remainingToYearGoal"]} more needed for one year.')


if __name__ == '__main__':
    main()
