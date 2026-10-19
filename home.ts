import type { GameContext } from '../domain/types.ts';
import { safe, footer } from './shared.ts';
import { html, arrowIcon } from './shared.ts';

export function renderHome(context: GameContext) {
  const { challenge, attempt } = context;
  return html`<div class="session-label">
      <span>${safe(context.player.displayName)}</span
      ><span>${safe(challenge.day)} · UTC</span>
    </div>
    <div class="hero">
      <div>
        <span class="tag"
          ><i></i>
          ${challenge.kind === 'demo' ? 'DEMO CHALLENGE' : 'DAILY CROWD CHALLENGE'}
          · #${safe(challenge.number)}</span
        >
      </div>
      <h1>Can you <span class="accent">read</span><br />the crowd?</h1>
      <p>
        Sometimes fit in. Sometimes stand out. Five prompts to prove you know
        what everyone else is thinking.
      </p>
    </div>
    <div class="orb" aria-hidden="true">
      ${arrowIcon}<small>THINK TWICE. ANSWER FAST.</small>
    </div>
    <div class="home-stats">
      <div class="stat">
        <strong>${challenge.prompts.length}</strong><small>questions</small>
      </div>
      <div class="stat">
        <strong>${challenge.roundSeconds}s</strong><small>per question</small>
      </div>
      <div class="stat">
        <strong>${challenge.prompts.length * 100}</strong
        ><small>points possible</small>
      </div>
    </div>
    <div class="bottom">
      <button class="btn" id="start">
        ${attempt ? 'Continue today’s game' : 'Play today’s Swerve'}
        ${arrowIcon}</button
      >${footer(challenge)}
    </div>`;
}
