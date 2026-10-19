import type { GameContext } from '../domain/types.ts';
import { modeEntries } from './shared.ts';
import { html, modeSymbol } from './shared.ts';

export function renderHelp(context: GameContext) {
  const { challenge, attempt } = context;
  const game = attempt!;
  return html`<div class="help">
      <p class="help-timer-note" id="helpTimerNote">
        ${game?.phase === 'round' ? 'Your round timer keeps running while help is open.' : 'Plan your strategies before you start.'}
      </p>
      <span class="tag"><i></i> HOW TO PLAY</span>
      <h2 style="margin-top:20px">Know the crowd.<br />Beat the crowd.</h2>
      <p>
        ${challenge.prompts.length} questions. ${challenge.roundSeconds} seconds
        each. You have five strategy tokens to spend.
      </p>
      ${modeEntries
        .map(
          ([k, m]) =>
            html`<div class="help-card">
              <strong style="color:${m.color}"
                >${modeSymbol(k)} ${m.name} · ${m.limit}
                ${m.limit === 1 ? 'use' : 'uses'}</strong
              >
              <p>
                ${m.desc}.
                ${k === 'blend' ? 'Earn more when your answer is popular.' : k === 'swerve' ? 'Earn more when your answer is uncommon but valid.' : 'The best answer is picked by roughly 17% of players.'}
              </p>
            </div>`,
        )
        .join('')}
      <div class="help-card">
        <strong>Play the long game.</strong>
        <p>
          You must spend exactly 2 Blend, 2 Swerve, and 1 Sweet Spot tokens
          across five rounds. You choose the strategy before each answer. Scores
          are revealed after every question.
        </p>
      </div>
      ${
        challenge.kind === 'demo'
          ? html`<p class="smallprint">
              Demo note: Each prompt has five curated answer groups.
              Unrecognized answers receive zero points. No answer is sent for
              review in this demo.
            </p>`
          : ''
      }
    </div>
    <div class="spacer"></div>
    <button class="btn" id="back">Got it →</button>`;
}
