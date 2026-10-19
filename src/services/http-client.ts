import type {
  Attempt,
  Challenge,
  GameContext,
  Submission,
} from '../domain/types.ts';
import type { GameClient } from './contracts.ts';
import { validAttempt } from './storage.ts';
import type { KeyValueStorage } from './storage.ts';

function validChallenge(value: unknown): value is Challenge {
  if (!value || typeof value !== 'object') return false;
  const c = value as Challenge;
  return (
    typeof c.id === 'string' &&
    typeof c.number === 'string' &&
    typeof c.day === 'string' &&
    c.kind === 'daily' &&
    Number.isFinite(Date.parse(c.opensAt)) &&
    Number.isFinite(Date.parse(c.closesAt)) &&
    Date.parse(c.closesAt) > Date.parse(c.opensAt) &&
    typeof c.scoringVersion === 'string' &&
    (c.practiceAllowed === undefined ||
      typeof c.practiceAllowed === 'boolean') &&
    Number.isInteger(c.roundSeconds) &&
    c.roundSeconds > 0 &&
    c.roundSeconds <= 300 &&
    Array.isArray(c.prompts) &&
    c.prompts.length === 5 &&
    c.prompts.every(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.q === 'string' &&
        typeof p.sub === 'string' &&
        (p.format === undefined ||
          (p.format === 'factual' &&
            p.choices === undefined &&
            Number.isInteger(p.answerCount) &&
            p.answerCount! >= 5 &&
            p.answerCount! <= 1000)) &&
        (c.scoringVersion !== 'attention-v1' || p.format === 'factual') &&
        (p.choices === undefined ||
          (Array.isArray(p.choices) &&
            p.choices.length >= 2 &&
            p.choices.length <= 30 &&
            p.choices.every(
              (choice) =>
                typeof choice === 'string' &&
                choice.length > 0 &&
                choice.length <= 70,
            ))) &&
        (p.source === undefined ||
          (p.source !== null &&
            typeof p.source.id === 'string' &&
            typeof p.source.title === 'string' &&
            Number.isInteger(p.source.year) &&
            Number.isInteger(p.source.n) &&
            p.source.n > 0 &&
            typeof p.source.url === 'string' &&
            p.source.url.startsWith('https://'))),
    )
  );
}

/** Future server transport. Never sends a claimed score, identity, percentage or deadline. */
export class HttpGameClient implements GameClient {
  private context!: GameContext;
  private offset = 0;
  constructor(
    private base: string,
    private drafts: KeyValueStorage,
    private fetcher: typeof fetch = fetch,
  ) {
    if (!base.startsWith('/') || base.startsWith('//'))
      throw new Error('API base must be a same-origin path such as /api.');
    this.base = base.replace(/\/$/, '');
  }
  now = (): number => Date.now() + this.offset;

  private async request(
    path: string,
    body?: object,
    key?: string,
  ): Promise<unknown> {
    const response = await this.fetcher(`${this.base}${path}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const message =
        response.status === 401
          ? 'Your session expired. Reload to continue.'
          : response.status === 409
            ? 'This game changed. Reload to recover your progress.'
            : response.status === 410
              ? 'This daily challenge has closed. Reload for the current game.'
              : 'Swerve couldn’t connect. Please try again.';
      throw new Error(message);
    }
    const data = (await response.json()) as { serverNow?: number };
    if (typeof data.serverNow !== 'number' || !Number.isFinite(data.serverNow))
      throw new Error('Swerve received an invalid server clock.');
    this.offset = data.serverNow - Date.now();
    return data;
  }

  async load(): Promise<GameContext> {
    const data = (await this.request('/game/today')) as GameContext;
    if (
      !validChallenge(data.challenge) ||
      !data.player ||
      typeof data.player.id !== 'string' ||
      typeof data.player.displayName !== 'string' ||
      !['guest', 'account'].includes(data.player.kind) ||
      !(
        data.attempt === null ||
        validAttempt(data.attempt, data.challenge, data.player)
      )
    )
      throw new Error('Swerve received invalid game data.');
    this.context = {
      challenge: data.challenge,
      player: data.player,
      attempt: data.attempt,
    };
    const attempt = this.context.attempt;
    if (attempt?.active) {
      try {
        const draft = JSON.parse(
          this.drafts.getItem(`swerve_remote_draft:${attempt.id}`) ?? 'null',
        ) as Attempt['active'];
        const merged = { ...attempt, active: draft };
        if (
          draft?.deadline === attempt.active.deadline &&
          draft?.i === attempt.active.i &&
          validAttempt(merged, data.challenge, data.player)
        )
          this.context.attempt = merged;
      } catch {
        /* Invalid drafts never invalidate server state. */
      }
    }
    return this.context;
  }
  private accept(value: unknown): Attempt {
    const attempt = (value as { attempt: unknown }).attempt;
    if (!validAttempt(attempt, this.context.challenge, this.context.player))
      throw new Error('Swerve received invalid progress. Reload to recover.');
    this.context.attempt = attempt;
    return attempt;
  }
  async start(): Promise<Attempt> {
    return this.accept(
      await this.request(
        '/attempts',
        { challengeId: this.context.challenge.id },
        `start:${this.context.challenge.id}`,
      ),
    );
  }
  async advance(attempt: Attempt): Promise<Attempt> {
    return this.accept(
      await this.request(
        `/attempts/${encodeURIComponent(attempt.id)}/next`,
        { completedRounds: attempt.results.length },
        `${attempt.id}:next:${attempt.results.length}`,
      ),
    );
  }
  async submit(attempt: Attempt, submission: Submission): Promise<Attempt> {
    const result = this.accept(
      await this.request(
        `/attempts/${encodeURIComponent(attempt.id)}/rounds`,
        {
          roundIndex: submission.roundIndex,
          mode: submission.mode,
          answer: submission.answer,
        },
        submission.requestId,
      ),
    );
    this.drafts.removeItem(`swerve_remote_draft:${attempt.id}`);
    return result;
  }
  saveDraft(attempt: Attempt): void {
    this.drafts.setItem(
      `swerve_remote_draft:${attempt.id}`,
      JSON.stringify(attempt.active),
    );
  }
  async replay(): Promise<GameContext> {
    throw new Error('Daily challenges can only be played once.');
  }
}
