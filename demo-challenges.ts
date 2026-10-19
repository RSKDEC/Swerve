import { DEMO_QUESTIONS } from '../data/demo-questions.ts';
import type { ChallengeRepository } from './contracts.ts';

export const demoChallenges: ChallengeRepository = {
  current(now) {
    const day = new Date(now).toISOString().slice(0, 10);
    const opensAt = `${day}T00:00:00.000Z`;
    return {
      id: `demo-${day}`,
      number: '001',
      day,
      opensAt,
      closesAt: new Date(Date.parse(opensAt) + 86_400_000).toISOString(),
      roundSeconds: 30,
      kind: 'demo',
      scoringVersion: 'prototype-v1',
      prompts: DEMO_QUESTIONS.map(({ q, sub }, i) => ({
        id: `demo-prompt-${i + 1}`,
        q,
        sub,
      })),
    };
  },
};
