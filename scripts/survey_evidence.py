"""Small offline readers for published survey evidence (Python standard library)."""
from __future__ import annotations
import hashlib
import io
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile

TABLE_NS = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0'
OFFICE_NS = 'urn:oasis:names:tc:opendocument:xmlns:office:1.0'


def fingerprint(text):
    text = unicodedata.normalize('NFKD', text).lower()
    return ' '.join(re.findall(r'[a-z0-9]+', text))


def evidence_digest(question):
    # Exclude source display metadata: the immutable scoring/question material is locked.
    frozen = {k: question[k] for k in ['id', 'q', 'groups']}
    return hashlib.sha256(json.dumps(frozen, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def ods_tables(blob):
    """Keep real cell coordinates, including merged/covered cells and repetitions."""
    document = ET.fromstring(zipfile.ZipFile(io.BytesIO(blob)).read('content.xml'))
    result = {}
    for table in document.findall('.//{' + TABLE_NS + '}table'):
        rows = {}
        index = 0
        for row in table.findall('{' + TABLE_NS + '}table-row'):
            cells = []
            for cell in row:
                if cell.tag not in {'{' + TABLE_NS + '}table-cell', '{' + TABLE_NS + '}covered-table-cell'}:
                    continue
                value = {'text': ' '.join(' '.join(cell.itertext()).split()), 'value': cell.get('{' + OFFICE_NS + '}value')}
                repeat = int(cell.get('{' + TABLE_NS + '}number-columns-repeated', '1'))
                # Selected references never need the thousands of empty trailing columns.
                cells.extend([value] * min(repeat, max(0, 64 - len(cells))))
                if len(cells) == 64:
                    break
            repetitions = int(row.get('{' + TABLE_NS + '}number-rows-repeated', '1'))
            if any(c['text'] or c['value'] is not None for c in cells):
                if repetitions != 1:
                    raise ValueError('Repeated nonempty spreadsheet rows require explicit review')
                rows[index] = cells
            index += repetitions
        result[table.get('{' + TABLE_NS + '}name')] = rows
    return result


def reserve_unique_days(questions, registry):
    """Retain all reservations and append fresh items only; never refill from old questions."""
    from collections import Counter
    from datetime import date, timedelta
    by_id = {q['id']: q for q in questions}
    used_ids, used_concepts, used_wording = set(), set(), set()
    entries = list(registry.get('days', []))
    first = date.fromisoformat(registry.get('firstDay', '2026-10-19'))
    for i, entry in enumerate(entries):
        if entry['day'] != (first + timedelta(days=i)).isoformat() or entry['number'] != str(i + 1).zfill(3) or len(entry['items']) != 5:
            raise ValueError('Publication registry must contain consecutive full five-round days')
        for item in entry['items']:
            q = by_id.get(item['questionId'])
            if not q or item['contentSha256'] != evidence_digest(q):
                raise ValueError('Reserved question removed or changed; published content must stay immutable')
            concept, wording = q['conceptKey'], q['wordingFingerprint']
            if item['conceptKey'] != concept or item['wordingFingerprint'] != wording:
                raise ValueError('Reserved question identity changed')
            if q['id'] in used_ids or concept in used_concepts or wording in used_wording:
                raise ValueError('Question reuse detected in publication registry')
            used_ids.add(q['id']); used_concepts.add(concept); used_wording.add(wording)
    remaining = [q for q in questions if q['id'] not in used_ids]
    while len(remaining) >= 5:
        chosen = []
        categories = Counter(); sources = Counter()
        for _ in range(5):
            category_supply = Counter(q['category'] for q in remaining)
            source_supply = Counter(q['source']['id'] for q in remaining)
            # Deterministic editorial mix; percentages never affect selection/order.
            q = max(remaining, key=lambda q: (
                categories[q['category']] == 0,
                sources[q['source']['id']] < 3,
                category_supply[q['category']],
                source_supply[q['source']['id']],
                hashlib.sha256(q['id'].encode()).hexdigest(),
            ))
            remaining.remove(q)
            if q['conceptKey'] in used_concepts or q['wordingFingerprint'] in used_wording:
                raise ValueError('Duplicate concept or original wording cannot be scheduled')
            used_ids.add(q['id']); used_concepts.add(q['conceptKey']); used_wording.add(q['wordingFingerprint'])
            categories[q['category']] += 1; sources[q['source']['id']] += 1
            chosen.append({'questionId': q['id'], 'conceptKey': q['conceptKey'],
                           'wordingFingerprint': q['wordingFingerprint'], 'contentSha256': evidence_digest(q)})
        i = len(entries)
        entries.append({'day': (first + timedelta(days=i)).isoformat(), 'number': str(i + 1).zfill(3), 'items': chosen})
    return {'version': 1, 'firstDay': first.isoformat(), 'days': entries}
