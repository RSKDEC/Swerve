import type {
  Attempt,
  Challenge,
  GameContext,
  Player,
  Submission,
} from '../domain/types.ts';

/** All UI calls use this boundary. A remote implementation owns clock, identity and score. */
export interface GameClient {
  load(): Promise<GameContext>;
  start(): Promise<Attempt>;
  advance(attempt: Attempt): Promise<Attempt>;
  submit(attempt: Attempt, submission: Submission): Promise<Attempt>;
  saveDraft(attempt: Attempt): void;
  replay(): Promise<GameContext>;
}

export interface ChallengeRepository {
  current(now: number): Challenge;
}
export interface PlayerRepository {
  current(): Player;
}
export interface AttemptRepository {
  load(challenge: Challenge, player: Player): Attempt | null;
  save(attempt: Attempt): void;
  remove(challengeId: string): void;
}
