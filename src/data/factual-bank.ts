import questions from './factual-questions.json' with { type: 'json' };
import calendar from './factual-calendar.json' with { type: 'json' };
import type { FactualQuestion, PreparedDay } from '../domain/types.ts';
export const FACTUAL_QUESTIONS: readonly FactualQuestion[] = questions;
export const FACTUAL_DAYS: readonly PreparedDay[] = calendar;
export const FACTUAL_CONTENT_VERSION = 'factual-v1';
const lookup = new Map(FACTUAL_QUESTIONS.map((q) => [q.id, q]));
export const factualQuestionById = (id: string): FactualQuestion | undefined =>
  lookup.get(id);
