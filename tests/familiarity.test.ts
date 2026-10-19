import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attentionIndex,
  familiarityPoints,
  matchFactual,
  normalizeFactual,
} from '../src/domain/familiarity.ts';
import {
  FACTUAL_DAYS,
  FACTUAL_QUESTIONS,
  factualQuestionById,
} from '../src/data/factual-bank.ts';
import { factualChallenges } from '../src/services/factual-challenges.ts';
import { validAttempt } from '../src/services/storage.ts';
import { total } from '../src/domain/game.ts';
import { fixture } from './fixtures.ts';
import type { Mode } from '../src/domain/types.ts';

const modes: Mode[] = ['blend', 'swerve', 'sweet', 'swerve', 'blend'];

test('attention ranking handles ties and never treats counts as a population percentage', () => {
  const counts = [10, 20, 30, 40, 50];
  assert.deepEqual(
    counts.map((c) => attentionIndex(counts, c)),
    [0, 25, 50, 75, 100],
  );
  assert.equal(attentionIndex([10, 20, 20, 40], 20), 50);
  assert.equal(attentionIndex([10, 10, 10], 10), 50);
  assert.equal(attentionIndex([100, 200, 300, 400, 500], 300), 50);
  assert.throws(() => attentionIndex([1], 1));
  assert.throws(() => attentionIndex([1, 2], 3));
  assert.throws(() => attentionIndex([1, NaN], 1));
});

test('scoring has a correct-answer floor, distinct strategy targets and a forgiving sweet band', () => {
  assert.equal(familiarityPoints('blend', 100), 100);
  assert.equal(familiarityPoints('blend', 0), 20);
  assert.equal(familiarityPoints('swerve', 0), 100);
  assert.equal(familiarityPoints('swerve', 100), 20);
  assert.equal(familiarityPoints('sweet', 40), 100);
  assert.equal(familiarityPoints('sweet', 60), 100);
  assert.equal(familiarityPoints('sweet', 35), 90);
  assert.equal(familiarityPoints('sweet', 65), 90);
  assert.equal(familiarityPoints('sweet', 0), 20);
  assert.equal(familiarityPoints('sweet', 100), 20);
  for (let index = 0; index <= 100; index += 0.25) {
    for (const mode of ['blend', 'swerve', 'sweet'] as const) {
      const points = familiarityPoints(mode, index);
      assert.ok(Number.isInteger(points) && points >= 20 && points <= 100);
    }
    assert.equal(
      familiarityPoints('blend', index),
      familiarityPoints('swerve', 100 - index),
    );
    if (index < 100) {
      assert.ok(
        familiarityPoints('blend', index + 0.25) >=
          familiarityPoints('blend', index),
      );
      assert.ok(
        familiarityPoints('swerve', index + 0.25) <=
          familiarityPoints('swerve', index),
      );
    }
  }
  for (const bad of [NaN, Infinity, -1, 101])
    assert.throws(() => familiarityPoints('blend', bad));
});

test('factual matching preserves single-letter symbols, resolves only reviewed aliases and accepts punctuation', () => {
  const elements = factualQuestionById('facts-one-letter-elements')!;
  assert.equal(matchFactual(elements, 'I')?.name, 'Iodine');
  assert.equal(matchFactual(elements, 'W')?.name, 'Tungsten');
  assert.equal(matchFactual(elements, 'CO'), null);
  assert.equal(matchFactual(elements, 'Hydrogne'), null);
  assert.equal(matchFactual(elements, 'Sulphur')?.name, 'Sulfur');
  assert.equal(normalizeFactual('  THE Lión King!  '), 'lion king');
  const pixar = factualQuestionById('facts-pixar-films')!;
  assert.equal(matchFactual(pixar, 'A Bugs Life')?.name, 'A Bug’s Life');
  assert.equal(matchFactual(pixar, 'wall e')?.name, 'WALL-E');
  assert.equal(matchFactual(pixar, 'Shrek'), null);
});

test('the pilot uses unique prompts, no answer choices, and a perfect fit for every strategy', () => {
  assert.equal(FACTUAL_QUESTIONS.length, 15);
  assert.equal(FACTUAL_DAYS.length, 3);
  const ids = FACTUAL_DAYS.flatMap((d) => d.questionIds);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(ids.length, FACTUAL_QUESTIONS.length);
  for (const q of FACTUAL_QUESTIONS) {
    assert.ok(q.sourceUrl.includes('oldid='));
    for (const mode of modes)
      assert.ok(
        q.answers.some((a) => familiarityPoints(mode, a.index) === 100),
        q.id,
      );
    for (const a of q.answers) {
      assert.equal(
        a.index,
        attentionIndex(
          q.answers.map((x) => x.views),
          a.views,
        ),
      );
      for (const alias of [a.name, ...a.aliases])
        assert.equal(matchFactual(q, alias), a);
    }
  }
  const day = factualChallenges.current(Date.parse('2026-10-19T12:00:00Z'));
  assert.equal(day.scoringVersion, 'attention-v1');
  for (const p of day.prompts) {
    assert.equal(p.format, 'factual');
    assert.ok(p.answerCount! >= 5);
    assert.equal(p.choices, undefined);
    assert.equal('answers' in p, false);
    assert.equal('index' in p, false);
  }
  assert.throws(
    () => factualChallenges.current(Date.parse('2026-10-22T00:00:00Z')),
    /being prepared/,
  );
});

test('every factual day supports 500 points, saved reveals, duplicate submissions and exact token limits', async () => {
  for (const day of FACTUAL_DAYS) {
    const f = fixture(factualChallenges);
    f.setNow(Date.parse(day.day + 'T12:00:00Z'));
    const context = await f.client.load();
    let attempt = await f.client.start();
    for (let i = 0; i < 5; i++) {
      attempt = await f.client.advance(attempt);
      const q = factualQuestionById(context.challenge.prompts[i].id)!;
      const a = q.answers.find(
        (a) => familiarityPoints(modes[i], a.index) === 100,
      )!;
      const submission = {
        roundIndex: i,
        mode: modes[i],
        answer: a.name,
        requestId: day.day + ':' + i,
      };
      attempt = await f.client.submit(attempt, submission);
      assert.equal(attempt.results[i].score, 100);
      assert.equal(attempt.results[i].pct, undefined);
      assert.equal(attempt.results[i].familiarity?.views, a.views);
      assert.deepEqual((await f.makeClient().load()).attempt, attempt);
      assert.equal(
        (await f.client.submit(attempt, submission)).results.length,
        i + 1,
      );
    }
    attempt = await f.client.advance(attempt);
    assert.equal(total(attempt), 500);
    assert.equal(attempt.phase, 'complete');
    const broken = structuredClone(attempt);
    broken.results[0].familiarity!.index = NaN;
    assert.equal(
      validAttempt(broken, context.challenge, context.player),
      false,
    );
    const wrong = structuredClone(attempt);
    wrong.results[0].score = 99;
    assert.equal(validAttempt(wrong, context.challenge, context.player), false);
  }
});

test('unknown and late answers earn zero; a listed deep cut is valid; legacy saves never attach', async () => {
  for (const kind of ['unknown', 'timeout', 'deep-cut'] as const) {
    const f = fixture(factualChallenges);
    f.setNow(Date.parse('2026-10-19T12:00:00Z'));
    const context = await f.client.load();
    let a = await f.client.advance(await f.client.start());
    const q = factualQuestionById(context.challenge.prompts[0].id)!;
    const answer = q.answers.find((a) => a.index === 0)!;
    if (kind === 'timeout') f.setNow(a.active!.deadline);
    a = await f.client.submit(a, {
      roundIndex: 0,
      mode: 'swerve',
      answer: kind === 'unknown' ? 'Disneyland' : answer.name,
      requestId: kind,
    });
    assert.equal(a.results[0].score, kind === 'deep-cut' ? 100 : 0);
    assert.equal(a.results[0].timeout, kind === 'timeout');
    assert.equal(a.results[0].unknown, kind === 'unknown');
    assert.equal(validAttempt(a, context.challenge, context.player), true);
    f.storage.setItem(
      'swerve_attempt_v2:reference-surveys-v2-unique-2026-10-19',
      JSON.stringify(a),
    );
    await f.client.replay();
    assert.equal((await f.makeClient().load()).attempt, null);
  }
});
