import { MODES, isFactual } from '../domain/modes.ts';
import { total } from '../domain/game.ts';
import type { GameContext } from '../domain/types.ts';
import { safe, footer } from './shared.ts';
import { html, arrowIcon, modeSymbol } from './shared.ts';

export function renderResults(context: GameContext) {
  const { challenge, attempt } = context;
  const game = attempt!;
  let score = total(game);
  const label = isFactual(challenge)
    ? score >= 400
      ? 'A brilliant balance.'
      : score >= 300
        ? 'You know your deep cuts.'
        : score >= 200
          ? 'A few good surprises.'
          : 'More to discover.'
    : score >= 400
      ? 'You ARE the crowd.'
      : score >= 300
        ? 'You know people.'
        : score >= 200
          ? 'A little unpredictable.'
          : 'The crowd surprised you.';
  return html`<div class="results">
      <span class="tag"
        ><i></i> ${challenge.kind === 'demo' ? 'DEMO' : 'DAILY'}
        #${safe(challenge.number)} · COMPLETED</span
      >
      <h1 style="margin-top:30px">${label}</h1>
      <div class="result-number">
        ${score}<span> / ${challenge.prompts.length * 100}</span>
      </div>
      <p>Your ${challenge.kind === 'demo' ? 'demo' : 'daily'} Swerve score</p>
      <div class="pills">
        ${game.results.map((r) => html`<div class="pill" title="${MODES[r.mode].name}: ${r.score} points" style="background:${MODES[r.mode].color}">${modeSymbol(r.mode)}</div>`).join('')}
      </div>
    </div>
    <div class="section-title">ROUND BREAKDOWN</div>
    ${game.results
      .map(
        (r, i) =>
          html`<div class="round-summary">
            <div>
              <strong>Round ${i + 1}</strong><br /><span
                >${MODES[r.mode].name} · ${safe(r.group || r.answer)}</span
              >
            </div>
            <strong>${r.score} pts</strong>
          </div>`,
      )
      .join('')}
    <div class="spacer"></div>
    <div class="bottom">
      <button class="btn" id="share">Share your Swerve ${arrowIcon}</button
      ><button class="btn secondary" style="margin-top:10px" id="copy">
        Copy result</button
      >${challenge.kind === 'demo' || challenge.practiceAllowed ? `<button class="btn ghost" style="margin-top:10px" id="reset">↻ ${challenge.kind === 'demo' ? 'Replay demo' : 'Replay for practice'}</button>` : ''}${footer(challenge)}
    </div>`;
}
