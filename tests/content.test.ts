import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PREPARED_DAYS,
  PREPARED_QUESTIONS,
  FIRST_PREPARED_DAY,
  LAST_PREPARED_DAY,
  questionById,
} from '../src/data/challenge-bank.ts';
import { demoChallenges } from '../src/services/demo-challenges.ts';
import { match, normalize, points } from '../src/domain/scoring.ts';
import { total } from '../src/domain/game.ts';
import type { Mode } from '../src/domain/types.ts';
import { fixture } from './fixtures.ts';
import { DEMO_QUESTIONS } from '../src/data/demo-questions.ts';

test('100 consecutive dates contain 500 distinct, non-repeated prompts across ten categories', () => {
  assert.equal(PREPARED_DAYS.length, 100);
  assert.equal(PREPARED_QUESTIONS.length, 500);
  assert.equal(FIRST_PREPARED_DAY, '2026-10-20');
  assert.equal(LAST_PREPARED_DAY, '2027-01-27');
  assert.equal(new Set(PREPARED_QUESTIONS.map((q) => q.id)).size, 500);
  assert.equal(
    new Set(PREPARED_QUESTIONS.map((q) => normalize(q.q))).size,
    500,
  );
  assert.equal(
    new Set(
      [...DEMO_QUESTIONS, ...PREPARED_QUESTIONS].map((q) => normalize(q.q)),
    ).size,
    505,
  );
  const scheduled = PREPARED_DAYS.flatMap((day) => day.questionIds);
  assert.equal(new Set(scheduled).size, 500);
  assert.equal(scheduled.length, 500);
  const categories = new Map<string, number>();
  for (const q of PREPARED_QUESTIONS)
    categories.set(q.category, (categories.get(q.category) ?? 0) + 1);
  assert.equal(categories.size, 10);
  for (const count of categories.values()) assert.equal(count, 50);
  for (const [i, day] of PREPARED_DAYS.entries()) {
    const expected = new Date(
      Date.parse(`${FIRST_PREPARED_DAY}T00:00:00Z`) + i * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    assert.equal(day.day, expected);
    assert.equal(day.number, String(i + 2).padStart(3, '0'));
    assert.equal(day.questionIds.length, 5);
    assert.equal(
      new Set(
        day.questionIds.map(
          (id) => PREPARED_QUESTIONS.find((q) => q.id === id)!.category,
        ),
      ).size,
      5,
    );
    for (const id of day.questionIds) assert.ok(questionById(id));
  }
});

test('every new answer bank has five valid groups, 100% total weight and unambiguous aliases', () => {
  for (const q of PREPARED_QUESTIONS) {
    assert.ok(q.q.length > 15 && q.q.length <= 160, q.id);
    assert.ok(q.sub.length > 0);
    assert.equal(q.groups.length, 5, q.id);
    assert.equal(
      q.groups.reduce((sum, g) => sum + g.pct, 0),
      100,
      q.id,
    );
    const owner = new Map<string, string>();
    for (const group of q.groups) {
      assert.ok(
        group.pct > 0 && group.pct <= 48 && Number.isInteger(group.pct),
        q.id,
      );
      assert.ok(group.aliases.length >= 1, `${q.id}: ${group.name}`);
      for (const answer of [group.name, ...group.aliases]) {
        const n = normalize(answer);
        assert.ok(n && answer.length <= 70, `${q.id}: ${answer}`);
        assert.ok(
          !owner.has(n) || owner.get(n) === group.name,
          `${q.id}: ambiguous ${answer}`,
        );
        owner.set(n, group.name);
        assert.equal(match(q, answer), group, `${q.id}: ${answer}`);
      }
    }
    assert.equal(match(q, 'zzzz unlisted answer zzzz'), null);
  }
});

test('UTC start/end boundaries select the correct set and do not silently loop the bank', () => {
  assert.equal(
    demoChallenges.current(Date.parse('2026-10-19T23:59:59.999Z')).number,
    '001',
  );
  const first = demoChallenges.current(Date.parse('2026-10-20T00:00:00Z'));
  assert.equal(first.number, '002');
  assert.equal(first.prompts[0].id, 'food-001');
  assert.equal(first.kind, 'demo');
  assert.equal(first.scoringVersion, 'prototype-v1:prepared-v1');
  assert.equal(
    demoChallenges.current(Date.parse('2027-01-27T23:59:59.999Z')).number,
    '101',
  );
  assert.throws(
    () => demoChallenges.current(Date.parse('2027-01-28T00:00:00Z')),
    /being prepared/,
  );
  assert.ok(first.prompts.every((q) => !('groups' in q)));
});

test('all 100 sets play with their own answer groups, correct scoring, complete results and saved state', async () => {
  const modes: Mode[] = ['blend', 'swerve', 'sweet', 'swerve', 'blend'];
  for (const day of PREPARED_DAYS) {
    const f = fixture();
    f.setNow(Date.parse(`${day.day}T12:00:00Z`));
    const context = await f.client.load();
    let attempt = await f.client.start();
    let expectedScore = 0;
    for (let i = 0; i < 5; i++) {
      attempt = await f.client.advance(attempt);
      const question = questionById(context.challenge.prompts[i].id);
      const mode = modes[i];
      const group =
        mode === 'blend'
          ? question.groups[0]
          : mode === 'swerve'
            ? question.groups.at(-1)!
            : question.groups[2];
      expectedScore += points(mode, group.pct);
      attempt = await f.client.submit(attempt, {
        roundIndex: i,
        mode,
        answer: group.name,
        requestId: `${attempt.id}:${i}`,
      });
      assert.equal(
        attempt.results[i].group,
        group.name,
        `${day.day} round ${i}`,
      );
      assert.deepEqual(
        attempt.results[i].distribution,
        question.groups.map(({ name, pct }) => ({ name, pct })),
      );
    }
    attempt = await f.client.advance(attempt);
    assert.equal(attempt.phase, 'complete');
    assert.equal(total(attempt), expectedScore);
    assert.ok(
      expectedScore >= 380 && expectedScore <= 500,
      `${day.day}: ${expectedScore}`,
    );
    assert.deepEqual((await f.makeClient().load()).attempt, attempt);
  }
});

test('an active round keeps its published answer bank across midnight, while a fresh load gets the next day', async () => {
  const f = fixture();
  f.setNow(Date.parse('2026-10-20T23:59:55Z'));
  const original = await f.client.load();
  const attempt = await f.client.advance(await f.client.start());
  attempt.active!.mode = 'blend';
  attempt.active!.answer = 'pizza';
  f.client.saveDraft(attempt);
  assert.deepEqual((await f.makeClient().load()).attempt, attempt);
  f.setNow(Date.parse('2026-10-21T00:00:01Z'));
  const result = await f.client.submit(attempt, {
    roundIndex: 0,
    mode: 'blend',
    answer: 'pizza',
    requestId: 'midnight',
  });
  assert.equal(result.results[0].score, 88);
  assert.equal(result.results[0].group, 'Pizza');
  const next = await f.makeClient().load();
  assert.notEqual(next.challenge.id, original.challenge.id);
  assert.notEqual(
    next.challenge.prompts[0].id,
    original.challenge.prompts[0].id,
  );
  assert.equal(next.attempt, null);
});

test('old v1 results are never migrated into a new prepared set', async () => {
  const f = fixture();
  f.setNow(Date.parse('2026-10-20T12:00:00Z'));
  f.storage.setItem(
    'swerve_demo_v1',
    JSON.stringify({
      day: '2026-10-20',
      started: f.now(),
      results: [
        {
          i: 0,
          mode: 'blend',
          answer: 'phone',
          group: 'Check their phone',
          pct: 48,
          score: 100,
          timeout: false,
          unknown: false,
        },
      ],
    }),
  );
  assert.equal((await f.client.load()).attempt, null);
});
