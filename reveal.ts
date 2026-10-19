import { MODES } from '../domain/modes.ts';
import { total } from '../domain/game.ts';
import { normalize } from '../domain/scoring.ts';
import type { GameContext } from '../domain/types.ts';
import { safe, progress, footer } from './shared.ts';
import { html } from './shared.ts';

export function renderReveal(context: GameContext) {
  const { challenge, attempt } = context;
  const game = attempt!;
  const r = game.results[game.results.length - 1];
  const reactions = r.timeout
    ? 'Time is up!'
    : r.unknown
      ? 'Creative answer — needs review'
      : r.score >= 85
        ? 'Crowd genius.'
        : r.score >= 60
          ? 'Nice read.'
          : r.score >= 35
            ? 'Not bad, not bad.'
            : 'The crowd had other ideas.';
  return html`${progress(game, challenge)}
    <div class="reveal-head">
      <div class="mini-label">ROUND ${r.i + 1} · ${MODES[r.mode].name}</div>
      <h2>${reactions}</h2>
      <div class="big">${r.score}<small> / 100</small></div>
      <p>
        ${r.timeout ? 'The timer ran out.' : r.unknown ? 'This answer is not in the demo’s curated answer bank.' : 'Only ' + r.pct + `% of the ${challenge.kind === 'demo' ? 'sample ' : ''}crowd gave your answer.`}
      </p>
    </div>
    <div class="response-label">
      You answered:
      <b>${safe(r.answer)}</b
      >${r.group && normalize(r.group) !== normalize(r.answer) ? ' · matched to <b>' + safe(r.group) + '</b>' : ''}
    </div>
    <div class="section-title" style="margin-top:19px">
      WHAT THE ${challenge.kind === 'demo' ? 'SAMPLE ' : ''}CROWD SAID
    </div>
    ${r.distribution
      .map(
        (g) =>
          html`<div class="bar-row ${r.group === g.name ? 'yours' : ''}">
            <div class="bar-top">
              <span>${safe(g.name)} ${r.group === g.name ? '✦' : ''}</span
              ><strong>${g.pct}%</strong>
            </div>
            <div class="bar"><div style="width:${g.pct}%"></div></div>
          </div>`,
      )
      .join('')}
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
