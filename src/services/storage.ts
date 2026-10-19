import { MODES } from '../domain/modes.ts';
import type { Attempt, Challenge, Player } from '../domain/types.ts';
import type { AttemptRepository, PlayerRepository } from './contracts.ts';
import { DEMO_QUESTIONS } from '../data/demo-questions.ts';
import { validFamiliarityResult } from '../domain/familiarity.ts';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Storage failures degrade to in-memory play and are visible to the player. */
export class SafeStorage implements KeyValueStorage {
  private memory = new Map<string, string>();
  unavailable = false;
  constructor(private backend: KeyValueStorage | null) {
    this.unavailable = !backend;
  }
  getItem(key: string): string | null {
    if (!this.unavailable) {
      try {
        const value = this.backend!.getItem(key);
        if (value !== null) this.memory.set(key, value);
        else this.memory.delete(key);
        return value;
      } catch {
        this.unavailable = true;
      }
    }
    return this.memory.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.memory.set(key, value);
    if (!this.unavailable) {
      try {
        this.backend!.setItem(key, value);
      } catch {
        this.unavailable = true;
      }
    }
  }
  removeItem(key: string): void {
    this.memory.delete(key);
    if (!this.unavailable) {
      try {
        this.backend!.removeItem(key);
      } catch {
        this.unavailable = true;
      }
    }
  }
}

export function browserStorage(): SafeStorage {
  try {
    return new SafeStorage(window.localStorage);
  } catch {
    return new SafeStorage(null);
  }
}

function parse(value: string | null): unknown {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/** Runtime validation is essential: localStorage is user-controlled, versioned data. */
export function validAttempt(
  value: unknown,
  challenge: Challenge,
  player: Player,
): value is Attempt {
  if (!value || typeof value !== 'object') return false;
  const a = value as Attempt;
  if (
    a.version !== 2 ||
    typeof a.id !== 'string' ||
    !a.id ||
    a.challengeId !== challenge.id ||
    a.playerId !== player.id ||
    !Number.isFinite(a.started) ||
    !Array.isArray(a.results) ||
    a.results.length > challenge.prompts.length ||
    !['ready', 'round', 'reveal', 'complete'].includes(a.phase)
  )
    return false;
  const used = { blend: 0, swerve: 0, sweet: 0 };
  for (const [i, r] of a.results.entries()) {
    if (
      !r ||
      !Object.hasOwn(MODES, r.mode) ||
      r.i !== i ||
      typeof r.answer !== 'string' ||
      r.answer.length > 70 ||
      !(r.group === null || typeof r.group === 'string') ||
      (challenge.scoringVersion === 'attention-v1'
        ? !validFamiliarityResult(r)
        : r.familiarity !== undefined ||
          typeof r.pct !== 'number' ||
          !Number.isFinite(r.pct) ||
          r.pct < 0 ||
          r.pct > 100) ||
      !Number.isInteger(r.score) ||
      r.score < 0 ||
      r.score > 100 ||
      typeof r.timeout !== 'boolean' ||
      typeof r.unknown !== 'boolean' ||
      !Array.isArray(r.distribution) ||
      r.distribution.some(
        (g) =>
          !g ||
          typeof g.name !== 'string' ||
          !Number.isFinite(g.pct) ||
          g.pct < 0 ||
          g.pct > 100,
      )
    )
      return false;
    if (++used[r.mode] > MODES[r.mode].limit) return false;
  }
  if (a.phase === 'round') {
    const active = a.active;
    return (
      !!active &&
      a.results.length < challenge.prompts.length &&
      active.i === a.results.length &&
      Number.isFinite(active.deadline) &&
      active.deadline >= a.started &&
      typeof active.answer === 'string' &&
      active.answer.length <= 70 &&
      (active.mode === null ||
        (Object.hasOwn(MODES, active.mode) &&
          used[active.mode] < MODES[active.mode].limit))
    );
  }
  return (
    a.active === null &&
    (a.phase !== 'ready' || a.results.length === 0) &&
    (a.phase !== 'reveal' || a.results.length > 0) &&
    (a.phase !== 'complete' || a.results.length === challenge.prompts.length)
  );
}

export class LocalPlayers implements PlayerRepository {
  constructor(
    private storage: KeyValueStorage,
    private uuid: () => string = () => crypto.randomUUID(),
  ) {}
  current(): Player {
    const saved = parse(
      this.storage.getItem('swerve_player_v1'),
    ) as Player | null;
    if (
      saved &&
      typeof saved.id === 'string' &&
      saved.id &&
      saved.kind === 'guest' &&
      typeof saved.displayName === 'string'
    )
      return saved;
    const player: Player = {
      id: this.uuid(),
      kind: 'guest',
      displayName: 'Guest player',
    };
    this.storage.setItem('swerve_player_v1', JSON.stringify(player));
    return player;
  }
}

export class LocalAttempts implements AttemptRepository {
  constructor(
    private storage: KeyValueStorage,
    private uuid: () => string = () => crypto.randomUUID(),
  ) {}
  load(challenge: Challenge, player: Player): Attempt | null {
    const saved = parse(
      this.storage.getItem(`swerve_attempt_v2:${challenge.id}`),
    );
    if (validAttempt(saved, challenge, player)) return saved;
    // V1 stored the original five prompts only; never attach those scores to a prepared set.
    if (challenge.number !== '001' || challenge.kind !== 'demo') return null;
    // Keep today's completed rounds from the original prototype. It never stored active rounds.
    const legacy = parse(this.storage.getItem('swerve_demo_v1')) as {
      day?: string;
      started?: number;
      results?: Attempt['results'];
    } | null;
    if (legacy?.day !== challenge.day || !Array.isArray(legacy.results))
      return null;
    const migrated: Attempt = {
      version: 2,
      id: this.uuid(),
      challengeId: challenge.id,
      playerId: player.id,
      started: legacy.started ?? Date.parse(challenge.opensAt),
      active: null,
      phase:
        legacy.results.length === challenge.prompts.length
          ? 'complete'
          : legacy.results.length
            ? 'reveal'
            : 'ready',
      results: legacy.results.map((r) => ({
        ...r,
        distribution:
          DEMO_QUESTIONS[r?.i]?.groups.map(({ name, pct }) => ({
            name,
            pct,
          })) ?? [],
      })),
    };
    if (!validAttempt(migrated, challenge, player)) return null;
    this.save(migrated);
    this.storage.removeItem('swerve_demo_v1');
    return migrated;
  }
  save(attempt: Attempt): void {
    this.storage.setItem(
      `swerve_attempt_v2:${attempt.challengeId}`,
      JSON.stringify(attempt),
    );
  }
  remove(challengeId: string): void {
    this.storage.removeItem(`swerve_attempt_v2:${challengeId}`);
  }
}
