import { DEMO_QUESTIONS } from '../data/demo-questions.ts';
import {
  CONTENT_VERSION,
  FIRST_PREPARED_DAY,
  preparedDay,
  questionById,
} from '../data/challenge-bank.ts';
import type { ChallengeRepository } from './contracts.ts';

export const demoChallenges: ChallengeRepository = {
  current(now) {
    const day = new Date(now).toISOString().slice(0, 10);
    const opensAt = `${day}T00:00:00.000Z`;
    const prepared = preparedDay(day);
    if (day >= FIRST_PREPARED_DAY && !prepared) {
      throw new Error(
        'The next Swerve challenge is being prepared. Please check back soon.',
      );
    }
    const prompts = prepared
      ? prepared.questionIds.map((id) => {
          const { q, sub } = questionById(id);
          return { id, q, sub };
        })
      : DEMO_QUESTIONS.map(({ q, sub }, i) => ({
          id: `demo-prompt-${i + 1}`,
          q,
          sub,
        }));
    return {
      id: `demo-${day}`,
      number: prepared?.number ?? '001',
      day,
      opensAt,
      closesAt: new Date(Date.parse(opensAt) + 86_400_000).toISOString(),
      roundSeconds: 30,
      kind: 'demo',
      scoringVersion: prepared
        ? `prototype-v1:${CONTENT_VERSION}`
        : 'prototype-v1',
      prompts,
    };
  },
};
