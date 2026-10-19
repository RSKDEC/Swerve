import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PREPARED_DAYS,
  PREPARED_QUESTIONS,
  FIRST_PREPARED_DAY,
  LAST_PREPARED_DAY,
  questionById,
  CONTENT_VERSION,
} from '../src/data/challenge-bank.ts';
import ledger from '../docs/content/survey-ledger.json' with { type: 'json' };
import { demoChallenges } from '../src/services/demo-challenges.ts';
import { match, normalize, points } from '../src/domain/scoring.ts';
import { total } from '../src/domain/game.ts';
import type { Mode } from '../src/domain/types.ts';
import { fixture } from './fixtures.ts';

test('100 consecutive distinct daily sets reuse only verified questions, with five categories per day', () => {
  assert.equal(PREPARED_DAYS.length, 100);
  assert.equal(PREPARED_QUESTIONS.length, 109);
  assert.equal(FIRST_PREPARED_DAY, '2026-10-20');
  assert.equal(LAST_PREPARED_DAY, '2027-01-27');
  assert.equal(new Set(PREPARED_QUESTIONS.map((q) => q.id)).size, 109);
  assert.equal(
    new Set(PREPARED_QUESTIONS.map((q) => normalize(q.q))).size,
    109,
  );
  assert.equal(
    new Set(PREPARED_DAYS.map((d) => d.questionIds.join(','))).size,
    100,
  );
  const scheduled = PREPARED_DAYS.flatMap((d) => d.questionIds);
  assert.equal(scheduled.length, 500);
  assert.equal(new Set(scheduled).size, 109); // Honest reuse, never 500 fabricated questions.
  const categories = new Map(PREPARED_QUESTIONS.map((q) => [q.id, q.category]));
  for (const [i, day] of PREPARED_DAYS.entries()) {
    assert.equal(
      day.day,
      new Date(Date.parse(`${FIRST_PREPARED_DAY}T00:00:00Z`) + i * 86400000)
        .toISOString()
        .slice(0, 10),
    );
    assert.equal(day.number, String(i + 2).padStart(3, '0'));
    assert.equal(day.questionIds.length, 5);
    assert.equal(
      new Set(day.questionIds.map((id) => categories.get(id))).size,
      5,
    );
    day.questionIds.forEach((id) => assert.ok(questionById(id).source));
  }
});

test('every percentage reconciles with raw-count evidence; no option is dropped or rescaled', () => {
  assert.equal(ledger.length, PREPARED_QUESTIONS.length);
  for (const q of PREPARED_QUESTIONS) {
    const evidence = ledger.find((e) => e.questionId === q.id)!;
    assert.ok(q.q.length > 15 && q.q.length <= 180, q.id);
    assert.ok(q.groups.length >= 2);
    assert.equal(
      evidence.validAnswers + evidence.missingAnswers,
      evidence.respondentCount,
    );
    assert.equal(
      evidence.options.reduce((sum, o) => sum + o.count, 0),
      q.source.n,
    );
    assert.equal(q.groups.length, evidence.options.length);
    assert.ok(
      Math.abs(q.groups.reduce((sum, g) => sum + g.pct, 0) - 100) < 1e-9,
    );
    const owner = new Map<string, string>();
    for (const group of q.groups) {
      const option = evidence.options.find((o) => o.label === group.name)!;
      assert.equal(group.pct, (100 * option.count) / evidence.validAnswers);
      assert.ok(group.pct > 0 && group.pct <= 100);
      for (const answer of [group.name, ...group.aliases]) {
        const normalized = normalize(answer);
        assert.ok(normalized && answer.length <= 70, `${q.id}: ${answer}`);
        assert.ok(
          !owner.has(normalized) || owner.get(normalized) === group.name,
          `${q.id}: ambiguous ${answer}`,
        );
        owner.set(normalized, group.name);
        assert.equal(match(q, answer), group);
      }
    }
    assert.equal(match(q, 'zzzz unlisted answer zzzz'), null);
  }
});

test('launch and schedule boundaries never expose fabricated content as real reference data', () => {
  assert.equal(
    demoChallenges.current(Date.parse('2026-10-18T23:59:59Z')).kind,
    'demo',
  );
  const launch = demoChallenges.current(Date.parse('2026-10-19T00:00:00Z'));
  const first = demoChallenges.current(Date.parse('2026-10-20T00:00:00Z'));
  assert.equal(launch.kind, 'daily');
  assert.equal(launch.number, '001');
  assert.ok(launch.prompts.every((p) => p.source));
  assert.equal(first.number, '002');
  assert.equal(first.scoringVersion, `prototype-v1:${CONTENT_VERSION}`);
  assert.equal(first.kind, 'daily');
  assert.equal(first.id, 'reference-surveys-v1-2026-10-20');
  assert.ok(
    first.prompts.every(
      (p) => !('groups' in p) && p.choices?.length && p.source?.n,
    ),
  );
  assert.equal(
    demoChallenges.current(Date.parse('2027-01-27T23:59:59.999Z')).number,
    '101',
  );
  assert.throws(
    () => demoChallenges.current(Date.parse('2027-01-28T00:00:00Z')),
    /being prepared/,
  );
});

test('all 100 sets retain strategy rules, evidence-based scoring, complete results and saved state', async () => {
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
      const groups = question.groups.toSorted((a, b) => b.pct - a.pct);
      const group =
        mode === 'blend'
          ? groups[0]
          : mode === 'swerve'
            ? groups.at(-1)!
            : groups.toSorted(
                (a, b) => Math.abs(a.pct - 17) - Math.abs(b.pct - 17),
              )[0];
      expectedScore += points(mode, group.pct);
      attempt = await f.client.submit(attempt, {
        roundIndex: i,
        mode,
        answer: group.name,
        requestId: `${attempt.id}:${i}`,
      });
      assert.equal(attempt.results[i].group, group.name);
      assert.deepEqual(
        attempt.results[i].distribution,
        question.groups.map(({ name, pct }) => ({ name, pct })),
      );
    }
    attempt = await f.client.advance(attempt);
    assert.equal(attempt.phase, 'complete');
    assert.equal(total(attempt), expectedScore);
    assert.deepEqual((await f.makeClient().load()).attempt, attempt);
  }
});

test('active rounds stay pinned across midnight, and fabricated v2 saves cannot attach to the new bank', async () => {
  const f = fixture();
  f.setNow(Date.parse('2026-10-20T23:59:55Z'));
  const context = await f.client.load();
  const attempt = await f.client.advance(await f.client.start());
  const q = questionById(context.challenge.prompts[0].id);
  f.setNow(Date.parse('2026-10-21T00:00:01Z'));
  const result = await f.client.submit(attempt, {
    roundIndex: 0,
    mode: 'blend',
    answer: q.groups[0].name,
    requestId: 'midnight',
  });
  assert.equal(result.results[0].score, points('blend', q.groups[0].pct));
  assert.equal(result.results[0].pct, q.groups[0].pct);
  const next = await f.makeClient().load();
  assert.notEqual(next.challenge.id, context.challenge.id);
  assert.equal(next.attempt, null);
  const oldId = 'demo-2026-10-21';
  f.storage.setItem(
    `swerve_attempt_v2:${oldId}`,
    JSON.stringify({ ...attempt, challengeId: oldId }),
  );
  assert.equal((await f.makeClient().load()).attempt, null);
});
