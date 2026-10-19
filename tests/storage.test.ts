import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SafeStorage, validAttempt } from '../src/services/storage.ts';
import { fixture } from './fixtures.ts';

test('legacy v1 results migrate without altering scores or identity', async () => {
  const f = fixture();
  f.storage.setItem(
    'swerve_demo_v1',
    JSON.stringify({
      day: '2026-10-18',
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
  const context = await f.client.load();
  assert.equal(context.attempt?.results[0].score, 100);
  assert.equal(context.attempt?.phase, 'reveal');
  assert.equal(context.attempt?.results[0].distribution.length, 5);
  assert.equal(f.storage.getItem('swerve_demo_v1'), null);
});

test('malformed saved states are ignored rather than crashing or poisoning a game', async () => {
  const f = fixture();
  const context = await f.client.load();
  const attempt = await f.client.advance(await f.client.start());
  const cases = [
    null,
    {},
    { ...attempt, version: 99 },
    { ...attempt, results: [null] },
    { ...attempt, phase: 'complete' },
    { ...attempt, playerId: 'someone-else' },
    { ...attempt, active: { ...attempt.active, mode: '__proto__' } },
    { ...attempt, active: { ...attempt.active, deadline: null } },
    { ...attempt, active: { ...attempt.active, i: 99 } },
  ];
  for (const value of cases)
    assert.equal(validAttempt(value, context.challenge, context.player), false);
  f.storage.setItem(`swerve_attempt_v2:${context.challenge.id}`, '{bad json');
  assert.equal((await f.client.load()).attempt, null);
  f.storage.setItem(
    'swerve_demo_v1',
    JSON.stringify({ day: context.challenge.day, results: [null] }),
  );
  assert.equal((await f.client.load()).attempt, null);
});

test('blocked storage still supports in-memory progress and exposes the limitation', () => {
  const storage = new SafeStorage({
    getItem() {
      throw new Error('Blocked');
    },
    setItem() {
      throw new Error('Blocked');
    },
    removeItem() {
      throw new Error('Blocked');
    },
  });
  assert.equal(storage.getItem('test'), null);
  assert.equal(storage.unavailable, true);
  storage.setItem('test', 'saved');
  assert.equal(storage.getItem('test'), 'saved');
  storage.removeItem('test');
  assert.equal(storage.getItem('test'), null);
});
