import { MODES } from './modes.ts';
import type { Attempt, Challenge, Mode, Player, RoundResult } from './types.ts';

export function counts(attempt: Attempt | null): Record<Mode, number> {
  const used = { blend: 0, swerve: 0, sweet: 0 };
  attempt?.results.forEach((result) => used[result.mode]++);
  return used;
}

export function available(attempt: Attempt, mode: Mode): boolean {
  return counts(attempt)[mode] < MODES[mode].limit;
}

export const total = (attempt: Attempt): number =>
  attempt.results.reduce((sum, result) => sum + result.score, 0);

export function secondsLeft(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function createAttempt(
  challenge: Challenge,
  player: Player,
  now: number,
  id: string,
): Attempt {
  return {
    version: 2,
    id,
    challengeId: challenge.id,
    playerId: player.id,
    started: now,
    phase: 'ready',
    results: [],
    active: null,
  };
}

export function advance(
  attempt: Attempt,
  challenge: Challenge,
  now: number,
): Attempt {
  if (attempt.phase === 'round' || attempt.phase === 'complete') return attempt;
  if (attempt.results.length === challenge.prompts.length) {
    return { ...attempt, phase: 'complete', active: null };
  }
  return {
    ...attempt,
    phase: 'round',
    active: {
      i: attempt.results.length,
      deadline: now + challenge.roundSeconds * 1000,
      mode: null,
      answer: '',
    },
  };
}

export function recordResult(attempt: Attempt, result: RoundResult): Attempt {
  // Makes duplicate submissions harmless; a completed round cannot be replaced.
  if (attempt.phase !== 'round' || result.i !== attempt.results.length)
    return attempt;
  if (!available(attempt, result.mode))
    throw new Error('That strategy has no tokens left.');
  return {
    ...attempt,
    phase: 'reveal',
    active: null,
    results: [...attempt.results, result],
  };
}

export function summaryText(attempt: Attempt, challenge: Challenge): string {
  const symbols = attempt.results
    .map((r) => (r.score >= 80 ? '🟩' : r.score >= 50 ? '🟨' : '⬛'))
    .join('');
  return `swerve. #${challenge.number}${challenge.kind === 'demo' ? ' · Demo' : ''}\n${total(attempt)}/${challenge.prompts.length * 100}\n${symbols}\n${attempt.results.map((r) => MODES[r.mode].symbol).join(' ')}\nCan you read the crowd?`;
}
