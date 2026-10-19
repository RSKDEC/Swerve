import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_QUESTIONS } from '../src/data/demo-questions.ts';
import { match, normalize, points } from '../src/domain/scoring.ts';

test('original five distributions each total 100%', () => {
  assert.equal(DEMO_QUESTIONS.length, 5);
  for (const q of DEMO_QUESTIONS)
    assert.equal(
      q.groups.reduce((n, g) => n + g.pct, 0),
      100,
    );
});

test('all original aliases and canonical names retain their group', () => {
  for (const q of DEMO_QUESTIONS)
    for (const group of q.groups) {
      for (const answer of [...group.aliases, group.name])
        assert.equal(match(q, answer), group);
    }
});

test('normalization preserves punctuation, case, accents, and stop-word behavior', () => {
  assert.equal(normalize('  THE Phóne!! '), 'phone');
  assert.equal(match(DEMO_QUESTIONS[0], 'check MY phone!')?.pct, 48);
  assert.equal(match(DEMO_QUESTIONS[0], 'an unlisted answer'), null);
  assert.equal(match(DEMO_QUESTIONS[0], '   '), null);
});

test('original scoring anchors, rounding and bounds remain unchanged', () => {
  assert.equal(points('blend', 48), 100);
  assert.equal(points('blend', 23), 48);
  assert.equal(points('blend', 100), 100);
  assert.equal(points('swerve', 6), 88);
  assert.equal(points('swerve', 48), 4);
  assert.equal(points('swerve', 100), 0);
  assert.equal(points('sweet', 17), 100);
  assert.equal(points('sweet', 12), 75);
  assert.equal(points('sweet', 40), 0);
  for (let p = 0; p <= 100; p++)
    for (const mode of ['blend', 'swerve', 'sweet'] as const) {
      assert.ok(points(mode, p) >= 0 && points(mode, p) <= 100);
    }
});
