import { DemoClient } from '../src/services/demo-client.ts';
import { demoChallenges } from '../src/services/demo-challenges.ts';
import {
  LocalAttempts,
  LocalPlayers,
  SafeStorage,
} from '../src/services/storage.ts';
import type { KeyValueStorage } from '../src/services/storage.ts';

export class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

export function fixture() {
  let now = Date.parse('2026-10-18T12:00:00Z');
  let id = 0;
  const storage = new SafeStorage(new MemoryStorage());
  const players = new LocalPlayers(storage, () => 'guest-1');
  const attempts = new LocalAttempts(storage, () => `migrated-${++id}`);
  const makeClient = () =>
    new DemoClient(
      demoChallenges,
      players,
      attempts,
      () => now,
      () => `attempt-${++id}`,
    );
  return {
    storage,
    players,
    attempts,
    makeClient,
    client: makeClient(),
    now: () => now,
    setNow: (value: number) => {
      now = value;
    },
  };
}
