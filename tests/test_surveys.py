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

    def test_source_counts_reconcile_with_known_items(self):
        _, audit = surveys.build()
        self.assertEqual(audit['verifiedQuestions'], 109)
        self.assertEqual(audit['scheduledSlots'], 500)
        self.assertEqual(audit['repeatedQuestionSlots'], 391)
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


if __name__ == '__main__':
    unittest.main()
