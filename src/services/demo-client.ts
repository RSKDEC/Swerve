import { questionById } from '../data/challenge-bank.ts';
import { MODES } from '../domain/modes.ts';
import {
  advance,
  available,
  createAttempt,
  recordResult,
} from '../domain/game.ts';
import { match, points } from '../domain/scoring.ts';
import type {
  Attempt,
  GameContext,
  Mode,
  Submission,
} from '../domain/types.ts';
import type {
  AttemptRepository,
  ChallengeRepository,
  GameClient,
  PlayerRepository,
} from './contracts.ts';

/** Deliberately local and non-competitive. Replace the entire client for production. */
export class DemoClient implements GameClient {
  private context!: GameContext;
  constructor(
    private challenges: ChallengeRepository,
    private players: PlayerRepository,
    private attempts: AttemptRepository,
    private now = () => Date.now(),
    private uuid: () => string = () => crypto.randomUUID(),
  ) {}

  async load(): Promise<GameContext> {
    const challenge = this.challenges.current(this.now());
    const player = this.players.current();
    this.context = {
      challenge,
      player,
      attempt: this.attempts.load(challenge, player),
    };
    return this.context;
  }
  private persist(attempt: Attempt): Attempt {
    this.attempts.save(attempt);
    this.context.attempt = attempt;
    return attempt;
  }
  private latest(candidate: Attempt): Attempt {
    const saved = this.attempts.load(
      this.context.challenge,
      this.context.player,
    );
    if (!saved || saved.id !== candidate.id)
      throw new Error('This game changed in another tab. Reload to continue.');
    return saved;
  }
  async start(): Promise<Attempt> {
    const current = this.attempts.load(
      this.context.challenge,
      this.context.player,
    );
    return this.persist(
      current ??
        createAttempt(
          this.context.challenge,
          this.context.player,
          this.now(),
          this.uuid(),
        ),
    );
  }
  async advance(attempt: Attempt): Promise<Attempt> {
    return this.persist(
      advance(this.latest(attempt), this.context.challenge, this.now()),
    );
  }
  saveDraft(attempt: Attempt): void {
    const current = this.latest(attempt);
    if (
      current.phase !== 'round' ||
      current.active?.i !== attempt.active?.i ||
      this.now() >= current.active!.deadline
    )
      return;
    const mode = attempt.active!.mode;
    if (mode && !available(current, mode)) return;
    this.persist({
      ...current,
      active: {
        ...current.active!,
        mode,
        answer: attempt.active!.answer.slice(0, 70),
      },
    });
  }
  async submit(attempt: Attempt, submission: Submission): Promise<Attempt> {
    const current = this.latest(attempt);
    if (submission.roundIndex < current.results.length) return current;
    if (
      current.phase !== 'round' ||
      current.active?.i !== submission.roundIndex
    )
      throw new Error('This round is no longer active. Reload to continue.');
    // Check at submission time, not on the last interval tick. Timeout always earns zero.
    const timeout = this.now() >= current.active.deadline;
    const chosen =
      submission.mode ??
      (Object.keys(MODES) as Mode[]).find((m) => available(current, m))!;
    if (!timeout && !submission.mode)
      throw new Error('Choose a strategy before answering.');
    if (!available(current, chosen))
      throw new Error('That strategy has no tokens left.');
    const answer = submission.answer.trim().slice(0, 70);
    if (!timeout && !answer)
      throw new Error('Enter an answer before submitting.');
    const question = questionById(
      this.context.challenge.prompts[submission.roundIndex].id,
    );
    const group = timeout ? null : match(question, answer);
    return this.persist(
      recordResult(current, {
        i: submission.roundIndex,
        mode: chosen,
        answer: answer || 'No answer',
        group: group?.name ?? null,
        pct: group?.pct ?? 0,
        score: group ? points(chosen, group.pct) : 0,
        timeout,
        unknown: !timeout && !group,
        distribution: question.groups.map(({ name, pct }) => ({ name, pct })),
      }),
    );
  }
  async replay(): Promise<GameContext> {
    this.attempts.remove(this.context.challenge.id);
    return this.load();
  }
}
