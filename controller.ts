import { secondsLeft, summaryText } from '../domain/game.ts';
import type { GameContext, Mode } from '../domain/types.ts';
import type { GameClient } from '../services/contracts.ts';
import { copyText, shareText } from '../services/sharing.ts';
import { renderHome } from './home.ts';
import { renderRound } from './round.ts';
import { renderReveal } from './reveal.ts';
import { renderResults } from './results.ts';
import { renderHelp } from './help.ts';

const element = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

/** Coordinates screens and effects; rules and scores belong to the client service. */
export class GameController {
  private context!: GameContext;
  private busy = false;
  private interval?: ReturnType<typeof setInterval>;
  private timeoutRequested = '';
  private warnedRound = '';
  private toastTimer?: ReturnType<typeof setTimeout>;
  private app = element('app');
  private help = element<HTMLDialogElement>('helpDialog');

  constructor(
    private client: GameClient,
    private storageUnavailable: () => boolean,
    private now = () => Date.now(),
  ) {}

  async mount(): Promise<void> {
    this.app.addEventListener('click', (event) => this.handleClick(event));
    this.app.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.submit();
    });
    this.app.addEventListener('input', (event) => {
      if ((event.target as HTMLElement).id === 'answer') this.saveDraft();
    });
    element('helpBtn').addEventListener('click', () => {
      element('helpContent').innerHTML = renderHelp(this.context);
      element('back').addEventListener('click', () => this.help.close());
      this.help.showModal();
    });
    element('cancelReplay').addEventListener('click', () =>
      element<HTMLDialogElement>('replayDialog').close(),
    );
    element('confirmReplay').addEventListener('click', () => {
      element<HTMLDialogElement>('replayDialog').close();
      void this.perform(async () => {
        this.context = await this.client.replay();
      });
    });
    element('closeShare').addEventListener('click', () =>
      element<HTMLDialogElement>('shareDialog').close(),
    );
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.tick();
    });
    window.addEventListener('pageshow', () => this.tick());
    // Reconcile another tab's saved progress without granting a fresh timer.
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('swerve_attempt_v2:') && !this.busy)
        void this.load();
    });
    await this.load();
    this.interval = setInterval(() => this.tick(), 120);
    window.addEventListener('pagehide', () => {
      // Persisted drafts are written on input; the absolute deadline survives page suspension.
      if (this.interval) clearInterval(this.interval);
    });
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) this.interval = setInterval(() => this.tick(), 120);
    });
  }

  private async load(): Promise<void> {
    await this.perform(async () => {
      this.context = await this.client.load();
    });
    element<HTMLButtonElement>('helpBtn').disabled = !this.context;
  }

  private async perform(action: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.app.setAttribute('aria-busy', 'true');
    this.app.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.disabled = true;
    });
    this.clearError();
    try {
      await action();
      this.draw();
    } catch (error) {
      if (this.context) this.draw(false);
      else {
        this.app.innerHTML =
          '<h2>Couldn’t load Swerve</h2><p>Please try again.</p><button class="btn" id="retryLoad">Try again</button>';
      }
      this.showError(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      this.busy = false;
      this.app.setAttribute('aria-busy', 'false');
      this.checkStorage();
      this.tick();
    }
  }

  private draw(focus = true): void {
    const phase = this.context.attempt?.phase;
    const render =
      phase === 'round'
        ? renderRound
        : phase === 'reveal'
          ? renderReveal
          : phase === 'complete'
            ? renderResults
            : renderHome;
    this.app.innerHTML =
      phase === 'round'
        ? renderRound(this.context, '', this.now())
        : render(this.context);
    if (focus && !this.help.open) {
      this.app.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    if (phase === 'reveal' && this.help.open)
      element('helpTimerNote').textContent =
        'Your round has ended. Close help to see your result.';
    if (phase === 'reveal') {
      const result = this.context.attempt!.results.at(-1)!;
      this.announce(
        `Round ${result.i + 1}: ${result.timeout ? 'Time is up. ' : ''}${result.score} points.`,
      );
    }
  }

  private handleClick(event: MouseEvent): void {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button',
    );
    if (!button || button.disabled || this.busy) return;
    const mode = button.dataset.mode as Mode | undefined;
    if (mode) {
      const attempt = this.context.attempt!;
      if (!attempt.active || this.now() >= attempt.active.deadline) {
        this.tick();
        return;
      }
      attempt.active.mode = mode;
      this.app
        .querySelectorAll<HTMLButtonElement>('[data-mode]')
        .forEach((option) => {
          const selected = option.dataset.mode === mode;
          option.classList.toggle('chosen', selected);
          option.setAttribute('aria-pressed', String(selected));
        });
      const input = element<HTMLInputElement>('answer');
      input.disabled = false;
      element<HTMLButtonElement>('submit').disabled = false;
      this.saveDraft();
      input.focus();
      return;
    }
    switch (button.id) {
      case 'start':
        void this.perform(async () => {
          this.context = await this.client.load();
          this.context.attempt = await this.client.start();
          if (this.context.attempt.phase === 'ready')
            this.context.attempt = await this.client.advance(
              this.context.attempt,
            );
        });
        break;
      case 'next':
        void this.perform(async () => {
          this.context.attempt = await this.client.advance(
            this.context.attempt!,
          );
        });
        break;
      case 'reset':
        element<HTMLDialogElement>('replayDialog').showModal();
        break;
      case 'copy':
        void this.share(false);
        break;
      case 'share':
        void this.share(true);
        break;
      case 'retryLoad':
        void this.load();
        break;
    }
  }

  private saveDraft(): void {
    const attempt = this.context.attempt;
    if (!attempt?.active) return;
    attempt.active.answer = element<HTMLInputElement>('answer').value;
    this.clearError();
    try {
      this.client.saveDraft(attempt);
    } catch (error) {
      this.showError(
        error instanceof Error ? error.message : 'Could not save this draft.',
      );
    }
    this.checkStorage();
  }

  private async submit(): Promise<void> {
    const attempt = this.context?.attempt;
    if (this.busy || attempt?.phase !== 'round' || !attempt.active) return;
    const active = attempt.active;
    const input = element<HTMLInputElement>('answer');
    const answer = input?.value ?? active.answer;
    if (this.now() < active.deadline && (!active.mode || !answer.trim())) {
      this.showError(
        !active.mode
          ? 'Choose a strategy before answering.'
          : 'Enter an answer before submitting.',
      );
      if (active.mode) input.focus();
      return;
    }
    const roundIndex = active.i;
    // Stable across retries, including a lost server response.
    const requestId = `${attempt.id}:round:${roundIndex}`;
    await this.perform(async () => {
      this.context.attempt = await this.client.submit(attempt, {
        roundIndex,
        mode: active.mode,
        answer,
        requestId,
      });
    });
  }

  private tick(): void {
    const attempt = this.context?.attempt;
    if (attempt?.phase !== 'round' || !attempt.active) return;
    const active = attempt.active;
    const seconds = secondsLeft(active.deadline, this.now());
    const timer = element('timer');
    if (timer) {
      timer.textContent = `◷ ${String(seconds).padStart(2, '0')}`;
      timer.classList.toggle('low', seconds <= 10);
    }
    const bar = element('timerBar');
    if (bar)
      bar.style.width = `${Math.min(100, Math.max(0, ((active.deadline - this.now()) / (this.context.challenge.roundSeconds * 1000)) * 100))}%`;
    const roundKey = `${attempt.id}:${active.i}`;
    if (!seconds && !this.busy) {
      const submit = element<HTMLButtonElement>('submit');
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Get round result →';
      }
      const input = element<HTMLInputElement>('answer');
      if (input) input.disabled = true;
    }
    if (seconds > 0 && seconds <= 10 && this.warnedRound !== roundKey) {
      this.warnedRound = roundKey;
      this.announce('10 seconds or less remaining.');
    }
    if (!seconds && !this.busy && this.timeoutRequested !== roundKey) {
      this.timeoutRequested = roundKey;
      void this.submit();
    }
  }

  private clearError(): void {
    element('pageError').hidden = true;
    const error = element('answerError');
    if (error) error.textContent = '';
    element<HTMLInputElement>('answer')?.removeAttribute('aria-invalid');
  }
  private showError(message: string): void {
    const fieldError = element('answerError');
    if (fieldError) {
      fieldError.textContent = message;
      element('answer')?.setAttribute('aria-invalid', 'true');
    } else {
      element('pageError').textContent = message;
      element('pageError').hidden = false;
    }
  }
  private announce(message: string): void {
    element('announcer').textContent = message;
  }
  private checkStorage(): void {
    const notice = element('storageNotice');
    notice.hidden = !this.storageUnavailable();
    notice.textContent =
      'Progress can’t be saved in this browser. Keep this tab open to finish your game.';
  }
  private toast(message: string): void {
    document.querySelector('.toast')?.remove();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.body.append(toast);
    this.toastTimer = setTimeout(() => toast.remove(), 2400);
  }
  private async share(native: boolean): Promise<void> {
    const text = summaryText(this.context.attempt!, this.context.challenge);
    const outcome = native
      ? await shareText(text)
      : (await copyText(text))
        ? 'copied'
        : 'manual';
    if (outcome === 'copied') this.toast('Result copied!');
    if (outcome === 'manual') {
      element<HTMLTextAreaElement>('shareText').value = text;
      element<HTMLDialogElement>('shareDialog').showModal();
      element<HTMLTextAreaElement>('shareText').select();
    }
  }
}
