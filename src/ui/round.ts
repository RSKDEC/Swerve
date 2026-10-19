import { available, counts, secondsLeft } from '../domain/game.ts';
import type { GameContext, Mode } from '../domain/types.ts';
import { safe, progress, modeEntries } from './shared.ts';
import { html, modeSymbol } from './shared.ts';

export function renderRound(
  context: GameContext,
  error = '',
  now = Date.now(),
) {
  const { challenge, attempt } = context;
  const game = attempt!;
  const current = game.active!.i,
    mode = game.active!.mode,
    value = game.active!.answer,
    remaining = secondsLeft(game.active!.deadline, now),
    invalid = error;
  const c = counts(game);
  const q = challenge.prompts[current];
  return html`<form id="answerForm" class="round-form">
    <div class="status-row">
      <span class="mini-label"
        >QUESTION ${current + 1} OF ${challenge.prompts.length}</span
      >
      <div
        class="timer"
        id="timer"
        role="timer"
        aria-label="Time remaining"
        aria-live="off"
      >
        ◷ ${String(remaining).padStart(2, '0')}
      </div>
    </div>
    <div class="timer-track">
      <div
        id="timerBar"
        style="width:${(remaining / challenge.roundSeconds) * 100}%"
      ></div>
    </div>
    ${progress(game, challenge)}
    <div class="prompt">
      <span class="mini-label">THE PROMPT</span>
      <h2>${safe(q.q)}</h2>
      <p class="hint">${safe(q.sub)}</p>
    </div>
    <fieldset class="mode-fieldset">
      <legend class="section-title">CHOOSE YOUR STRATEGY</legend>
      <div class="mode-list">
        ${modeEntries
          .map(
            ([key, m]) =>
              html`<button
                type="button"
                aria-pressed="${mode === key}"
                class="mode ${mode === key ? 'chosen' : ''}"
                data-mode="${key}"
                ${!available(game, key as Mode) ? 'disabled' : ''}
              >
                <span
                  class="mode-icon"
                  style="background:${m.bg};color:${m.color}"
                  >${modeSymbol(key)}</span
                ><span class="mode-info"
                  ><b>${m.name}</b><small>${m.desc}</small></span
                ><span class="tokens">${m.limit - c[key]} left</span>
              </button>`,
          )
          .join('')}
      </div>
    </fieldset>
    <div class="answer">
      <label class="section-title" for="answer">YOUR ANSWER</label
      ><input
        class="input"
        id="answer"
        aria-describedby="answerHint answerError"
        enterkeyhint="done"
        maxlength="70"
        ${!mode ? 'disabled' : ''}
        value="${safe(value)}"
        placeholder="Type your answer..."
        autocomplete="off"
        autocapitalize="sentences"
      />
      <div class="error" id="answerError" role="alert">${safe(invalid)}</div>
    </div>
    <div class="spacer"></div>
    <div class="answer-actions">
      <button type="submit" class="btn" id="submit" ${!mode ? 'disabled' : ''}>
        Lock it in →
      </button>
      <p
        id="answerHint"
        class="smallprint"
        style="text-align:center;margin-top:11px"
      >
        Select a strategy before answering.
        ${challenge.kind === 'demo' ? 'Unrecognized answers earn 0 points in this demo.' : 'Your answer locks when the timer ends.'}
      </p>
    </div>
  </form>`;
}
