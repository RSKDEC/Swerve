"""Offline, deterministic import of pinned, CC BY 4.0 FiveThirtyEight responses.

No network, generated counts, percentage presets, cross-question inference, or
renormalization of multiple-selection columns. Editorial maps are exhaustive
one-to-one labels for single-response items. Run --check in CI.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import csv
from datetime import date, timedelta
import hashlib
import html
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / 'content/surveys'
VERSION = 'surveys-v1'
EXPECTED_ROWS = {'comma-survey': 1129, 'flying-etiquette-survey': 1040,
                 'food-world-cup': 1373, 'star-wars-survey': 1186,
                 'steak-survey': 550, 'thanksgiving-2015': 1058}
METADATA_SOURCES = {'star-wars-survey', 'steak-survey'}


def load_table(blob: bytes, metadata: bool = False):
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
    ids = [row[0] for row in rows]
    if any(not value.isdigit() for value in ids) or len(set(ids)) != len(ids):
        raise ValueError('Invalid or duplicate respondent IDs')
    return header, subheader, rows, encoding


def count_item(rows, column, options):
    counts = Counter(row[column].strip() for row in rows)
    missing = counts.pop('', 0)
    raw = [o['raw'] for o in options]
    labels = [o['label'] for o in options]
    if len(raw) != len(set(raw)) or len(labels) != len(set(labels)):
        raise ValueError('Option mappings must be one-to-one')
    if set(counts) != set(raw):
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
    for sid, source in sources.items():
        tables[sid] = load_table((SOURCE_ROOT / source['file']).read_bytes(), sid in METADATA_SOURCES)
        if len(tables[sid][2]) != EXPECTED_ROWS[sid]:
            raise ValueError(f'Respondent count drift: {sid}')
    questions, ledger = [], []
    seen = set()
    for spec in editorial['questions']:
        sid, col = spec['source'], spec['column']
        if (sid, col) in seen:
            raise ValueError('Duplicated source item')
        seen.add((sid, col))
        header, subheader, rows, encoding = tables[sid]
        groups, counts, base, missing = count_item(rows, col, spec['options'])
        source = sources[sid]
        question_source = {
            'id': sid, 'title': source['title'], 'year': source['year'],
            'n': base, 'url': f'https://github.com/fivethirtyeight/data/blob/{commit}/{source["file"]}',
        }
        q = {
            'id': spec['id'], 'category': spec['category'], 'q': spec['prompt'],
            'sub': f'{source["year"]} reference group · {base:,} answers. {spec["context"]}',
            'groups': groups, 'source': question_source,
        }
        questions.append(q)
        ledger.append({
            'questionId': q['id'], 'source': question_source, 'sourceCommit': commit,
            'columnIndex': col, 'originalWording': header[col] or header[15 if col >= 15 else 9],
            'originalSubheading': subheader[col] if subheader else None,
            'encoding': encoding, 'respondentCount': len(rows), 'validAnswers': base,
            'missingAnswers': missing, 'population': source['population'],
            'fieldDate': source['fieldDate'], 'dateNote': 'Year identifies the historical dataset; exact field date unknown unless stated.',
            'weighting': source['weighting'], 'denominator': 'Nonblank answers to this exact single-response item. Missing/skipped is excluded, never treated as No.',
            'transformation': 'Shortened prompt/labels, no merging or inferred responses. pct = 100 × count / validAnswers. Scores use the unrounded fraction; display rounds to one decimal.',
            'options': [{'raw': o['raw'], 'label': o['label'], 'count': counts[o['raw']],
                         'pct': 100 * counts[o['raw']] / base} for o in spec['options']],
        })
    if len({q['id'] for q in questions}) != len(questions):
        raise ValueError('Duplicate question ID')
    buckets = defaultdict(list)
    for q in questions:
        buckets[q['category']].append(q['id'])
    if len(buckets) != 5:
        raise ValueError('Expected five daily categories')
    categories = list(buckets)
    days = []
    for i in range(100):
        ids = [buckets[c][i % len(buckets[c])] for c in categories]
        offset = i % 5
        days.append({'number': str(i + 2).zfill(3),
                     'day': (date(2026, 10, 20) + timedelta(days=i)).isoformat(),
                     'questionIds': ids[offset:] + ids[:offset]})
    if len({tuple(d['questionIds']) for d in days}) != 100:
        raise ValueError('Repeated daily set')
    scheduled = {qid for d in days for qid in d['questionIds']}
    if scheduled != {q['id'] for q in questions}:
        raise ValueError('Unscheduled evidence')
    audit = {
        'version': VERSION, 'sourceCommit': commit, 'verifiedQuestions': len(questions),
        'scheduledDays': len(days), 'scheduledSlots': 500, 'distinctDailySets': 100,
        'repeatedQuestionSlots': 500 - len(questions),
        'categories': {c: len(ids) for c, ids in buckets.items()},
        'minValidAnswers': min(q['source']['n'] for q in questions),
        'sourceCount': len(sources), 'currentOrRepresentativeClaim': False,
        'limits': ['Historical response frequencies, not current public opinion.',
                   'Unweighted item-specific valid response bases, not all respondents.',
                   'Some questions repeat; 100 distinct daily sets do not mean 500 distinct questions.',
                   'No multi-select blocks, demographic subdivisions, or simulated people are imported.'],
    }
    esc = html.escape
    credits = ['<!doctype html><html lang="en"><meta charset="utf-8">',
               '<meta name="viewport" content="width=device-width, initial-scale=1">',
               '<title>Swerve · Data credits</title>',
               '<style>body{font:17px/1.6 system-ui;background:#111320;color:#f6f7fc;max-width:760px;padding:24px;margin:auto}a{color:#7bdec3}details{border-bottom:1px solid #35394b;padding:16px 0}summary{cursor:pointer}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:4px;border-bottom:1px solid #35394b}code{overflow-wrap:anywhere}small{color:#a7aabb}</style>',
               '<a href="./">← Swerve</a><h1>Data credits</h1>',
               '<p>Response data: <a href="https://github.com/fivethirtyeight/data">FiveThirtyEight</a>, ',
               '<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. ',
               'Adapted by Swerve: shortened prompts and labels; unweighted shares calculated from recorded responses. No endorsement is implied.</p>',
               '<p>These are historical reference groups from 2014–2015, not today’s players or a current population estimate. ',
               'Each share uses only the nonblank answers to that specific question. “Unfamiliar” remains a real answer; missing responses are excluded. ',
               'Rounded displays may not total exactly 100%. Scoring uses unrounded shares.</p>',
               f'<p>{len(questions)} verified questions rotate across 100 distinct daily sets. Questions repeat. ',
               'The source details below contain answer spoilers.</p>']
    for item, q in zip(ledger, questions):
        s = item['source']
        wording = item['originalWording'] + (' / ' + item['originalSubheading'] if item['originalSubheading'] else '')
        credits += [f'<details id="{esc(q["id"])}"><summary>{esc(q["q"])}</summary>',
                    f'<p>{s["year"]} · {s["n"]:,} valid answers of {item["respondentCount"]:,} records; {item["missingAnswers"]:,} blank/skipped. ',
                    f'<a href="{esc(s["url"])}">Original data</a> · column {item["columnIndex"]} (zero-based).</p>',
                    f'<p>Original wording: {esc(wording)}</p><p>{esc(item["population"])} {esc(item["weighting"])}</p>',
                    '<table><thead><tr><th>Response</th><th>Count</th><th>Share</th></tr></thead><tbody>']
        credits.extend(f'<tr><td>{esc(o["label"])}</td><td>{o["count"]}</td><td>{o["pct"]:.1f}%</td></tr>' for o in item['options'])
        credits += ['</tbody></table>', f'<small>{esc(item["transformation"])}</small></details>']
    credits.append('<script>function openSource(){const target=document.getElementById(location.hash.slice(1));if(target instanceof HTMLDetailsElement){target.open=true;target.scrollIntoView();}}openSource();addEventListener("hashchange",openSource);</script></html>\n')
    return {
        'src/data/prepared-questions.json': json_text(questions),
        'src/data/challenge-calendar.json': json_text(days),
        'docs/content/survey-ledger.json': json_text(ledger),
        'docs/content/survey-audit.json': json_text(audit),
        'public/data-credits.html': '\n'.join(credits),
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
          '100 distinct daily sets / 500 slots, with repeats.')


if __name__ == '__main__':
    main()
