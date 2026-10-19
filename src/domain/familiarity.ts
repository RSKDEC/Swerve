import type { FactualQuestion, Mode, RoundResult } from './types.ts';

export const FAMILIARITY_SCORING_VERSION = 'attention-v1';
export const VIEW_WINDOW = 'July–September 2026';

/** Preserve words and single-letter symbols. Never guess a near-match. */
export const normalizeFactual = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/^the\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

export function matchFactual(question: FactualQuestion, value: string) {
  const key = normalizeFactual(value);
  if (!key) return null;
  return (
    question.answers.find((a) =>
      [a.name, ...a.aliases].some((alias) => normalizeFactual(alias) === key),
    ) ?? null
  );
}

/** Relative attention, not a probability or a share of people. Ties share rank. */
export function attentionIndex(
  views: readonly number[],
  value: number,
): number {
  if (
    views.length < 2 ||
    !views.includes(value) ||
    views.some((v) => !Number.isSafeInteger(v) || v < 0)
  )
    throw new Error('Invalid familiarity evidence.');
  const lower = views.filter((v) => v < value).length;
  const tied = views.filter((v) => v === value).length;
  return (100 * (lower + (tied - 1) / 2)) / (views.length - 1);
}

/** 20 for a listed correct answer + up to 80 for the strategy. No speed bonus. */
export function familiarityPoints(mode: Mode, index: number): number {
  if (!Number.isFinite(index) || index < 0 || index > 100)
    throw new Error('Invalid familiarity index.');
  const fit =
    mode === 'blend'
      ? index / 100
      : mode === 'swerve'
        ? 1 - index / 100
        : 1 - Math.max(40 - index, index - 60, 0) / 40;
  return Math.round(20 + 80 * fit);
}

export const familiarityLabel = (index: number): string =>
  index >= 80
    ? 'Spotlight'
    : index >= 60
      ? 'Well known'
      : index >= 40
        ? 'Middle ground'
        : index >= 20
          ? 'Offbeat'
          : 'Deep cut';

export function scoreExplanation(mode: Mode, index: number): string {
  return mode === 'blend'
    ? 'Blend rewards answers nearer the spotlight.'
    : mode === 'swerve'
      ? 'Swerve rewards answers with less recorded attention.'
      : index >= 40 && index <= 60
        ? 'Right in the Sweet Spot: the middle 40–60 band.'
        : 'Sweet Spot rewards the middle 40–60 band. Closer earns more.';
}

/** Validate untrusted saved/API results before they reach the reveal renderer. */
export function validFamiliarityResult(result: RoundResult): boolean {
  const f = result.familiarity;
  if (
    !f ||
    f.kind !== 'attention-v1' ||
    result.pct !== undefined ||
    !Array.isArray(result.distribution) ||
    result.distribution.length !== 0 ||
    typeof f.window !== 'string' ||
    !f.window ||
    f.window.length > 100 ||
    !Array.isArray(f.answers) ||
    f.answers.length < 5 ||
    f.answers.length > 1000
  )
    return false;
  if (
    f.answers.some(
      (a) =>
        !a ||
        typeof a.name !== 'string' ||
        !a.name ||
        a.name.length > 70 ||
        !Number.isFinite(a.index) ||
        a.index < 0 ||
        a.index > 100 ||
        !Number.isSafeInteger(a.views) ||
        a.views < 0 ||
        a.score !== familiarityPoints(result.mode, a.index),
    )
  )
    return false;
  if (
    new Set(f.answers.map((a) => normalizeFactual(a.name))).size !==
    f.answers.length
  )
    return false;
  if (result.timeout || result.unknown)
    return (
      !(result.timeout && result.unknown) &&
      result.group === null &&
      result.score === 0 &&
      f.index === null &&
      f.views === null
    );
  if (
    f.index === null ||
    f.views === null ||
    !Number.isFinite(f.index) ||
    f.index < 0 ||
    f.index > 100
  )
    return false;
  return (
    f.answers.some(
      (a) =>
        a.name === result.group && a.views === f.views && a.index === f.index,
    ) && result.score === familiarityPoints(result.mode, f.index)
  );
}
