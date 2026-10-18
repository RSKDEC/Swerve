import { MODES } from '../domain/modes.ts';
import type {
  Attempt,
  Challenge,
  Mode,
  ModeDefinition,
} from '../domain/types.ts';

export const modeEntries = Object.entries(MODES) as [Mode, ModeDefinition][];
// Formatting helper, not an escaping helper. Escape untrusted text with safe().
export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  return strings.reduce(
    (result, part, i) => result + part + (values[i] ?? ''),
    '',
  );
}
export const arrowIcon =
  '<svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const modeSymbol = (mode: Mode): string =>
  mode === 'swerve' ? arrowIcon : MODES[mode].symbol;
export const safe = (value: string): string =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

export function progress(attempt: Attempt, challenge: Challenge): string {
  return `<div class="progress" role="img" aria-label="${attempt.results.length} of ${challenge.prompts.length} rounds completed">${challenge.prompts.map((_, i) => `<div class="seg ${i < attempt.results.length ? 'done' : i === attempt.results.length ? 'current' : ''}"></div>`).join('')}</div>`;
}

export function footer(challenge: Challenge): string {
  return `<div class="footer-note">${challenge.kind === 'demo' ? 'Demo · Sample crowd data · No live leaderboard' : 'A new challenge every day · UTC'}</div>`;
}
