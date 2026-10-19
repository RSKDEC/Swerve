import questions from './prepared-questions.json' with { type: 'json' };
import calendar from './challenge-calendar.json' with { type: 'json' };
import { DEMO_QUESTIONS } from './demo-questions.ts';
import type {
  DemoQuestion,
  PreparedDay,
  PreparedQuestion,
} from '../domain/types.ts';

/** Generated only from pinned survey responses. See content/surveys and the ledger. */
export const PREPARED_QUESTIONS: readonly PreparedQuestion[] = questions;
export const PREPARED_DAYS: readonly PreparedDay[] = calendar;
export const CONTENT_VERSION = 'surveys-v1';
export const REFERENCE_LAUNCH_DAY = '2026-10-19';
export const FIRST_PREPARED_DAY = PREPARED_DAYS[0].day;
export const LAST_PREPARED_DAY = PREPARED_DAYS.at(-1)!.day;
const questionsById = new Map(
  PREPARED_QUESTIONS.map((question) => [question.id, question]),
);
const daysByDate = new Map(PREPARED_DAYS.map((day) => [day.day, day]));
const originalById = new Map(
  DEMO_QUESTIONS.map((question, i) => [`demo-prompt-${i + 1}`, question]),
);

export function questionById(id: string): DemoQuestion {
  const question = questionsById.get(id) ?? originalById.get(id);
  if (!question)
    throw new Error(
      'This challenge could not be loaded. Please reload Swerve.',
    );
  return question;
}

export function preparedDay(date: string): PreparedDay | null {
  return daysByDate.get(date) ?? null;
}
