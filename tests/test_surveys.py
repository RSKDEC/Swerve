"""Independent edge-case checks for the evidence importer."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('surveys', Path(__file__).resolve().parents[1] / 'scripts/import-surveys.py')
surveys = importlib.util.module_from_spec(spec)
spec.loader.exec_module(surveys)


class SurveyEvidenceTests(unittest.TestCase):
    def test_missing_is_not_no_and_metadata_is_not_a_person(self):
        blob = b'RespondentID,Answer\n,Response\n1,Yes\n2,No\n3,\n'
        _, _, rows, _ = surveys.load_table(blob, True)
        self.assertEqual(len(rows), 3)
        # Repeat valid rows only to meet the explicit minimum item base.
        options = [{'raw': x, 'label': x, 'aliases': []} for x in ['Yes', 'No']]
        groups, _, base, missing = surveys.count_item(rows * 100, 1, options)
        self.assertEqual((base, missing), (200, 100))
        self.assertEqual([g['pct'] for g in groups], [50, 50])

    def test_duplicate_ids_and_schema_drift_fail_closed(self):
        for blob in [b'ID,Q\n1,Yes\n1,No\n', b'ID,Q\n1,Yes,extra\n', b'ID,Q\n,Response\n']:
            with self.assertRaises(ValueError):
                surveys.load_table(blob)

    def test_strict_encoding_and_quoted_newline(self):
        _, _, rows, encoding = surveys.load_table('ID,Q\n1,"caf\xe9\nchoice"\n'.encode('cp1252'))
        self.assertEqual(encoding, 'cp1252')
        self.assertEqual(rows[0][1], 'café\nchoice')

    def test_unmapped_response_cannot_be_silently_dropped(self):
        with self.assertRaisesRegex(ValueError, 'Unmapped'):
            surveys.count_item([['1', 'Yes']] * 200 + [['2', 'Unknown']], 1,
                               [{'raw': 'Yes', 'label': 'Yes', 'aliases': []}])

    def test_zero_is_allowed_only_for_an_explicitly_documented_offered_choice(self):
        options = [{'raw':x,'label':x,'aliases':[]} for x in ['Yes','No']]
        rows = [['1','Yes']] * 200
        with self.assertRaisesRegex(ValueError, 'Unmapped'):
            surveys.count_item(rows, 1, options)
        groups, counts, base, missing = surveys.count_item(rows, 1, options, ['Yes','No'])
        self.assertEqual([g['pct'] for g in groups], [100,0])
        self.assertEqual((base, missing, counts['No']), (200,0,0))
        with self.assertRaisesRegex(ValueError, 'documented'):
            surveys.count_item(rows, 1, options, ['Yes','No','Maybe'])

    def test_source_counts_reconcile_with_known_items(self):
        _, audit = surveys.build()
        self.assertEqual(audit['verifiedQuestions'], 310)
        self.assertEqual(audit['scheduledSlots'], 310)
        self.assertEqual(audit['repeatedQuestionSlots'], 0)
        outputs, _ = surveys.build()
        import json
        ledger = {x['questionId']: x for x in json.loads(outputs['docs/content/survey-ledger.json'])}
        comma = ledger['comma-survey-01']
        self.assertEqual(comma['validAnswers'], 1129)
        self.assertEqual({x['label']: x['count'] for x in comma['options']},
                         {'With Oxford comma': 641, 'Without Oxford comma': 488})
        steak = ledger['steak-survey-09']
        self.assertEqual((steak['respondentCount'], steak['validAnswers'], steak['missingAnswers']), (550, 432, 118))
        self.assertEqual(next(x['count'] for x in steak['options'] if x['label'] == 'Medium rare'), 166)

class PublicationRegistryTests(unittest.TestCase):
    def sample(self, count):
        return [{'id':f'q-{i}', 'q':f'Question about distinct topic {i}', 'category':str(i % 5),
                 'conceptKey':f'topic-{i}', 'wordingFingerprint':f'original topic {i}',
                 'groups':[{'name':'Yes','pct':60,'aliases':[]},{'name':'No','pct':40,'aliases':[]}],
                 'source':{'id':f'source-{i % 3}'}} for i in range(count)]

    def test_append_preserves_reservations_and_leaves_partial_day_unused(self):
        reserve = surveys.reserve_unique_days
        first = reserve(self.sample(12), {'firstDay':'2026-10-19','days':[]})
        self.assertEqual(len(first['days']), 2)
        extended = reserve(self.sample(17), first)
        self.assertEqual(extended['days'][:2], first['days'])
        self.assertEqual(len(extended['days']), 3)
        ids = [q['questionId'] for d in extended['days'] for q in d['items']]
        self.assertEqual(len(ids), len(set(ids)))

    def test_changed_reserved_content_and_duplicate_original_wording_fail(self):
        import copy
        questions = self.sample(10)
        reserved = surveys.reserve_unique_days(questions, {'days':[]})
        changed = copy.deepcopy(questions)
        changed[0]['groups'][0]['pct'] = 61
        with self.assertRaisesRegex(ValueError, 'changed'):
            surveys.reserve_unique_days(changed, reserved)
        duplicate = self.sample(10)
        duplicate[1]['wordingFingerprint'] = duplicate[0]['wordingFingerprint']
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            surveys.reserve_unique_days(duplicate, {'days':[]})

    def test_merged_spreadsheet_cells_keep_numeric_coordinates(self):
        import io, zipfile
        xml = '''<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><table:table table:name="Example"><table:table-row><table:table-cell><text:p>Shared</text:p></table:table-cell><table:covered-table-cell/><table:table-cell office:value="42"><text:p>42</text:p></table:table-cell></table:table-row></table:table></office:document-content>'''
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as z:z.writestr('content.xml', xml)
        rows = surveys.ods_tables(buffer.getvalue())['Example']
        self.assertEqual(rows[0][1]['text'], '')
        self.assertEqual(rows[0][2]['value'], '42')

    def test_weighted_shares_are_not_inferred_raw_counts_and_frequency_labels_are_correct(self):
        import json
        outputs, _ = surveys.build()
        ledger = {q['questionId']:q for q in json.loads(outputs['docs/content/survey-ledger.json'])}
        driving = ledger['ntas0601b-r17']
        self.assertEqual(driving['validAnswers'], 2694)
        self.assertEqual(driving['options'][0]['label'], 'Several times a day')
        self.assertAlmostEqual(driving['options'][0]['pct'], 26.980329861101751)
        self.assertTrue(all(o['count'] is None for o in driving['options']))
        punctuality = ledger['young-people-2013-108']
        self.assertIn('Timekeeping', punctuality['originalWording'])
        self.assertEqual(sum(o['count'] for o in punctuality['options']), punctuality['validAnswers'])
        community = ledger['community-life-b1a']
        self.assertIsNone(community['missingAnswers'])
        self.assertEqual(sum(o['count'] for o in community['options']), 170685)


if __name__ == '__main__':
    unittest.main()
