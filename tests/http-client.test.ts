import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpGameClient } from '../src/services/http-client.ts';
import { fixture, MemoryStorage } from './fixtures.ts';

test('HTTP transport sends answers and stable idempotency keys, never client scoring claims', async () => {
  const f = fixture();
  const context = await f.client.load();
  const attempt = await f.client.advance(await f.client.start());
  const completed = await f.client.submit(attempt, {
    roundIndex: 0,
    mode: 'blend',
    answer: 'phone',
    requestId: 'a',
  });
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const data = String(url).endsWith('/today')
      ? {
          ...context,
          challenge: { ...context.challenge, kind: 'daily' },
          attempt,
        }
      : { attempt: completed };
    return Response.json({ ...data, serverNow: Date.now() + 5000 });
  };
  const remote = new HttpGameClient('/api', new MemoryStorage(), fetcher);
  const loaded = await remote.load();
  assert.equal(loaded.challenge.kind, 'daily');
  const result = await remote.submit(attempt, {
    roundIndex: 0,
    mode: 'blend',
    answer: 'phone',
    requestId: 'attempt-1:round:0',
  });
  assert.equal(result.results[0].score, 100);
  assert.equal(calls[1].url, `/api/attempts/${attempt.id}/rounds`);
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), {
    roundIndex: 0,
    mode: 'blend',
    answer: 'phone',
  });
  assert.equal(
    new Headers(calls[1].init?.headers).get('Idempotency-Key'),
    'attempt-1:round:0',
  );
  assert.equal(calls[1].init?.credentials, 'same-origin');
  assert.ok(Math.abs(remote.now() - Date.now() - 5000) < 100);
  await assert.rejects(remote.replay(), /only be played once/);
});

test('HTTP transport rejects malformed data and exposes recoverable HTTP errors', async () => {
  const storage = new MemoryStorage();
  for (const status of [401, 409, 410, 500]) {
    const remote = new HttpGameClient(
      '/api',
      storage,
      async () => new Response('', { status }),
    );
    await assert.rejects(
      remote.load(),
      /session expired|game changed|challenge has closed|couldn’t connect/,
    );
  }
  const bad = new HttpGameClient('/api', storage, async () =>
    Response.json({ serverNow: Date.now(), challenge: null }),
  );
  await assert.rejects(bad.load(), /invalid game data/);
  assert.throws(
    () => new HttpGameClient('https://example.com/api', storage),
    /same-origin/,
  );
});

test('remote drafts survive refresh only when tied to the exact server round deadline', async () => {
  const f = fixture();
  const context = await f.client.load();
  const attempt = await f.client.advance(await f.client.start());
  const storage = new MemoryStorage();
  const remote = new HttpGameClient('/api', storage, async () =>
    Response.json({
      ...context,
      challenge: { ...context.challenge, kind: 'daily' },
      attempt,
      serverNow: Date.now(),
    }),
  );
  const draft = structuredClone(attempt);
  draft.active!.answer = 'my phone';
  draft.active!.mode = 'blend';
  remote.saveDraft(draft);
  assert.equal((await remote.load()).attempt?.active?.answer, 'my phone');
  draft.active!.deadline += 30000;
  remote.saveDraft(draft);
  assert.equal((await remote.load()).attempt?.active?.answer, '');
});
