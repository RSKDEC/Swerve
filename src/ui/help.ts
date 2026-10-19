import type { GameContext } from '../domain/types.ts';
import { modesFor, isFactual } from '../domain/modes.ts';
import { html, modeSymbol } from './shared.ts';

export function renderHelp(context: GameContext) {
  const { challenge, attempt } = context;
  const game = attempt!;
  return html`<div class="help">
      <p class="help-timer-note" id="helpTimerNote">
        ${game?.phase === 'round' ? 'Your round timer keeps running while help is open.' : 'Plan your strategies before you start.'}
      </p>
      <span class="tag"><i></i> HOW TO PLAY</span>
      <h2 style="margin-top:20px">
        ${isFactual(challenge) ? 'Know the obvious.<br />Find the unexpected.' : 'Know the crowd.<br />Beat the crowd.'}
      </h2>
      <p>
        ${challenge.prompts.length} questions. ${challenge.roundSeconds} seconds
        each. You have five strategy tokens to spend.
      </p>
      ${modesFor(challenge)
        .map(
          ([k, m]) =>
            html`<div class="help-card">
              <strong style="color:${m.color}"
                >${modeSymbol(k)} ${m.name} · ${m.limit}
                ${m.limit === 1 ? 'use' : 'uses'}</strong
              >
              <p>
                ${m.desc}.
                ${isFactual(challenge) ? (k === 'blend' ? 'Higher attention index, higher score.' : k === 'swerve' ? 'Lower attention index, higher score.' : 'Hit index 40–60 for 100 points. Near misses still score well.') : k === 'blend' ? 'Earn more when your answer is popular.' : k === 'swerve' ? 'Earn more when your answer is uncommon but valid.' : 'Aim for an answer chosen by roughly 17% of the reference group.'}
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
        isFactual(challenge)
          ? html`<div class="help-card">
                <strong>Correct first. Clever second.</strong>
                <p>
                  Type one factual answer. Every listed correct answer earns 20
                  points, plus up to 80 for your strategy. Blanks, timeouts and
                  unlisted answers earn zero. There is no speed bonus.
                </p>
              </div>
              <p class="smallprint">
                The attention index ranks answers by English Wikipedia article
                views in a frozen July–September 2026 snapshot. It is a
                familiarity proxy, not a survey or live player percentage.
                Scores stay fixed for everyone. Aliases are accepted; near
                spellings are not guessed.
                <a href="./factual-credits.html" target="_blank" rel="noopener"
                  >Sources & scoring</a
                >.
              </p>`
          : challenge.kind === 'demo'
            ? html`<p class="smallprint">
                Demo note: Each prompt has five curated answer groups.
                Unrecognized answers receive zero points. No answer is sent for
                review in this demo.
              </p>`
            : html`<p class="smallprint">
                Choose one listed response or type it. You predict the dated
                reference group shown with each prompt. Blank or unrecognized
                answers earn zero; no answers are sent for review. Shares use
                recorded responses, not live player votes.
                <a href="./data-credits.html" target="_blank" rel="noopener"
                  >Data credits and methodology</a
                >.
              </p>`
      }
    </div>
    <div class="spacer"></div>
    <button class="btn" id="back">Got it →</button>`;
}
