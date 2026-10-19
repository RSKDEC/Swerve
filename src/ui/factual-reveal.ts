import type { GameContext } from '../domain/types.ts';
import { MODES } from '../domain/modes.ts';
import { total } from '../domain/game.ts';
import {
  familiarityLabel,
  normalizeFactual,
  scoreExplanation,
} from '../domain/familiarity.ts';
import { safe, progress, footer, html } from './shared.ts';

export function renderFactualReveal({
  challenge,
  attempt,
}: GameContext): string {
  const game = attempt!;
  const r = game.results.at(-1)!;
  const f = r.familiarity!;
  const index = f.index;
  const title = r.timeout
    ? 'Time is up!'
    : r.unknown
      ? 'Not on this list'
      : r.score === 100
        ? 'Perfect strategy.'
        : r.score >= 80
          ? 'Nicely played.'
          : r.score >= 50
            ? 'A good find.'
            : 'Correct. Another angle?';
  const sorted = f.answers.toSorted(
    (a, b) =>
      b.score - a.score || b.index - a.index || a.name.localeCompare(b.name),
  );
  const row = (a: (typeof sorted)[number]) =>
    html`<div class="answer-discovery ${a.name === r.group ? 'yours' : ''}">
      <span
        ><b>${safe(a.name)}${a.name === r.group ? ' ✦' : ''}</b
        ><small
          >${familiarityLabel(a.index)} · index ${Math.round(a.index)}</small
        ></span
      ><strong>${a.score}<small> pts</small></strong>
    </div>`;
  return html`${progress(game, challenge)}
    <div class="reveal-head">
      <div class="mini-label">ROUND ${r.i + 1} · ${MODES[r.mode].name}</div>
      <h2>${title}</h2>
      <div class="big">${r.score}<small> / 100</small></div>
      <p>
        ${r.timeout ? 'The timer ran out.' : r.unknown ? 'We could not match this to an accepted answer. It may be a spelling issue or an omission; unlisted answers earn zero.' : '20 for a listed correct answer + ' + (r.score - 20) + ' strategy points.'}
      </p>
    </div>
    <div class="response-label">
      You answered:
      <b>${safe(r.answer)}</b
      >${r.group && normalizeFactual(r.group) !== normalizeFactual(r.answer) ? ' · matched to <b>' + safe(r.group) + '</b>' : ''}
    </div>
    ${
      index === null
        ? ''
        : html`<div class="attention-card">
            <div class="attention-heading">
              <b>${familiarityLabel(index)}</b
              ><span
                >Attention index <strong>${Math.round(index)}</strong> /
                100</span
              >
            </div>
            <div
              class="attention-scale"
              role="img"
              aria-label="Attention index ${Math.round(index)} out of 100; 0 is overlooked, 100 is spotlight"
            >
              <span class="sweet-band"></span><i style="left:${index}%"></i>
            </div>
            <div class="attention-ends">
              <span>Overlooked</span><span>Spotlight</span>
            </div>
            <p>${scoreExplanation(r.mode, index)}</p>
            <small
              >${f.views!.toLocaleString('en-US')} article views ·
              ${safe(f.window)}. Relative to this question’s answers; not a
              percentage of people.</small
            >
          </div>`
    }
    <div class="section-title" style="margin-top:20px">
      ANSWERS WORTH KNOWING · ${MODES[r.mode].name}
    </div>
    <p class="smallprint">Best fits for the strategy you spent.</p>
    ${sorted.slice(0, 3).map(row).join('')}
    <details class="answer-explorer">
      <summary>Explore all ${f.answers.length} accepted answers</summary>
      ${sorted.map(row).join('')}
    </details>
    <p class="smallprint">
      <a
        href="./factual-credits.html#${safe(challenge.prompts[r.i].id)}"
        target="_blank"
        rel="noopener"
        >Answer sources & scoring evidence</a
      >
    </p>
    <div class="scoreline">
      <span>Total score so far</span
      ><strong>${total(game)} / ${(r.i + 1) * 100}</strong>
    </div>
    <div class="spacer"></div>
    <button class="btn" id="next">
      ${r.i === challenge.prompts.length - 1 ? 'See your results' : 'Next question'}
      →</button
    >${footer(challenge)}`;
}
