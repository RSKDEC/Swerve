import { test } from 'node:test';
import assert from 'node:assert/strict';
import { counts, secondsLeft, summaryText, total } from '../src/domain/game.ts';
import type { Mode } from '../src/domain/types.ts';
import { fixture } from './fixtures.ts';

test('full original game scores 437, consumes 2/2/1, reveals each round, shares without spoilers', async () => {
  const f = fixture();
  const context = await f.client.load();
  let attempt = await f.client.start();
  const answers: [Mode, string, number][] = [
    ['blend', 'phone', 100],
    ['swerve', 'wine', 84],
    ['sweet', 'wallet', 100],
    ['swerve', 'book', 86],
    ['blend', 'keys', 67],
  ];
  for (const [i, [mode, answer, score]] of answers.entries()) {
    attempt = await f.client.advance(attempt);
    assert.equal(attempt.active?.i, i);
    attempt = await f.client.submit(attempt, {
      roundIndex: i,
      mode,
      answer,
      requestId: `${i}`,
    });
    assert.equal(attempt.phase, 'reveal');
    assert.equal(attempt.results[i].score, score);
    assert.equal(attempt.results[i].distribution.length, 5);
  }
  attempt = await f.client.advance(attempt);
  assert.equal(attempt.phase, 'complete');
  assert.equal(total(attempt), 437);
  assert.deepEqual(counts(attempt), { blend: 2, swerve: 2, sweet: 1 });
  const shared = summaryText(attempt, context.challenge);
  assert.match(shared, /437\/500/);
  assert.match(shared, /Demo/);
  for (const [, answer] of answers) assert.ok(!shared.includes(answer));
  assert.equal((await f.makeClient().load()).attempt?.phase, 'complete');
});

test('blank answers and missing strategy are recoverable without spending tokens', async () => {
  const f = fixture();
  await f.client.load();
  const attempt = await f.client.advance(await f.client.start());
  await assert.rejects(
    f.client.submit(attempt, {
      roundIndex: 0,
      mode: 'blend',
      answer: '  ',
      requestId: 'a',
    }),
    /Enter an answer/,
  );
  await assert.rejects(
    f.client.submit(attempt, {
      roundIndex: 0,
      mode: null,
      answer: 'phone',
      requestId: 'a',
    }),
    /Choose a strategy/,
  );
  assert.equal((await f.client.load()).attempt?.results.length, 0);
});

test('unknown answers score zero, never become a rare valid Swerve', async () => {
  const f = fixture();
  await f.client.load();
  const attempt = await f.client.advance(await f.client.start());
  const result = (
    await f.client.submit(attempt, {
      roundIndex: 0,
      mode: 'swerve',
      answer: '<img src=x onerror=alert(1)>',
      requestId: 'a',
    })
  ).results[0];
  assert.equal(result.score, 0);
  assert.equal(result.unknown, true);
  assert.equal(result.group, null);
});

test('deadline is authoritative at the exact boundary, including a typed valid answer', async () => {
  for (const [elapsed, score, timeout] of [
    [29999, 100, false],
    [30000, 0, true],
    [90000, 0, true],
  ] as const) {
    const f = fixture();
    await f.client.load();
    const attempt = await f.client.advance(await f.client.start());
    f.setNow(f.now() + elapsed);
    const result = (
      await f.client.submit(attempt, {
        roundIndex: 0,
        mode: 'blend',
        answer: 'phone',
        requestId: 'a',
      })
    ).results[0];
    assert.equal(result.score, score);
    assert.equal(result.timeout, timeout);
  }
});

test('unselected timeouts spend first available token in the original order', async () => {
  const f = fixture();
  await f.client.load();
  let attempt = await f.client.start();
  for (let i = 0; i < 5; i++) {
    attempt = await f.client.advance(attempt);
    f.setNow(attempt.active!.deadline);
    attempt = await f.client.submit(attempt, {
      roundIndex: i,
      mode: null,
      answer: '',
      requestId: `${i}`,
    });
  }
  assert.deepEqual(
    attempt.results.map((r) => r.mode),
    ['blend', 'blend', 'swerve', 'swerve', 'sweet'],
  );
  assert.equal(total(attempt), 0);
});

test('refresh retains mode, answer, phase and original deadline; next round starts only on advance', async () => {
  const f = fixture();
  await f.client.load();
  const attempt = await f.client.advance(await f.client.start());
  attempt.active!.mode = 'sweet';
  attempt.active!.answer = 'phone';
  f.client.saveDraft(attempt);
  f.setNow(f.now() + 17000);
  const reloaded = await f.makeClient().load();
  assert.deepEqual(reloaded.attempt, attempt);
  assert.equal(secondsLeft(attempt.active!.deadline, f.now()), 13);
  const result = await f.client.submit(attempt, {
    roundIndex: 0,
    mode: 'sweet',
    answer: 'phone',
    requestId: 'a',
  });
  f.setNow(f.now() + 90000);
  assert.equal((await f.makeClient().load()).attempt?.phase, 'reveal');
  assert.equal(result.active, null);
});

test('duplicates cannot rescore or consume another token, even after advancing', async () => {
  const f = fixture();
  await f.client.load();
  const attempt = await f.client.advance(await f.client.start());
  const command = {
    roundIndex: 0,
    mode: 'blend' as const,
    answer: 'phone',
    requestId: 'same',
  };
  const result = await f.client.submit(attempt, command);
  assert.deepEqual(await f.client.submit(attempt, command), result);
  await f.client.advance(result);
  const duplicate = await f.client.submit(attempt, command);
  assert.equal(duplicate.results.length, 1);
  assert.equal(duplicate.active?.i, 1);
});

test('exhausted strategies are rejected; replay does not reuse an old attempt', async () => {
  const f = fixture();
  await f.client.load();
  let attempt = await f.client.advance(await f.client.start());
  attempt = await f.client.submit(attempt, {
    roundIndex: 0,
    mode: 'sweet',
    answer: 'phone',
    requestId: 'a',
  });
  attempt = await f.client.advance(attempt);
  await assert.rejects(
    f.client.submit(attempt, {
      roundIndex: 1,
      mode: 'sweet',
      answer: 'wine',
      requestId: 'b',
    }),
    /no tokens/,
  );
  const id = attempt.id;
  assert.equal((await f.client.replay()).attempt, null);
  assert.notEqual((await f.client.start()).id, id);
  await assert.rejects(f.client.advance(attempt), /another tab/);
});

test('UTC rollover has a new challenge and no carried-over attempt', async () => {
  const f = fixture();
  const first = await f.client.load();
  await f.client.start();
  f.setNow(Date.parse('2026-10-19T00:00:00Z'));
  const next = await f.client.load();
  assert.notEqual(first.challenge.id, next.challenge.id);
  assert.equal(next.challenge.day, '2026-10-19');
  assert.equal(next.attempt, null);
  assert.equal(next.player.id, first.player.id);
  assert.ok(next.challenge.prompts.every((p) => !('groups' in p)));
});
