import type { DemoQuestion, Mode } from './types.ts';

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(their|his|her|my|a|an|the|some|to|i|they)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function match(q: DemoQuestion, typed: string) {
  let n = normalize(typed);
  if (!n) return null;
  for (const g of q.groups) {
    if (g.aliases.some((a) => normalize(a) === n) || normalize(g.name) === n)
      return g;
  }
  return null;
}

export function points(m: Mode, p: number) {
  if (m === 'blend')
    return Math.max(0, Math.min(100, Math.round((p / 48) * 100)));
  if (m === 'swerve')
    return Math.max(0, Math.min(100, Math.round((1 - p / 50) * 100)));
  return Math.max(0, Math.round(100 - Math.abs(p - 17) * 5));
}
