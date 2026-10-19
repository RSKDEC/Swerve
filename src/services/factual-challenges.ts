import {
  FACTUAL_DAYS,
  FACTUAL_CONTENT_VERSION,
  factualQuestionById,
} from '../data/factual-bank.ts';
import { FAMILIARITY_SCORING_VERSION } from '../domain/familiarity.ts';
import { demoChallenges } from './demo-challenges.ts';
import type { ChallengeRepository } from './contracts.ts';

export const factualChallenges: ChallengeRepository = {
  current(now) {
    const day = new Date(now).toISOString().slice(0, 10);
    if (day < FACTUAL_DAYS[0].day) return demoChallenges.current(now);
    const prepared = FACTUAL_DAYS.find((d) => d.day === day);
    if (!prepared)
      throw new Error(
        'The next Swerve challenge is being prepared. Please check back soon.',
      );
    const opensAt = day + 'T00:00:00.000Z';
    return {
      id: `${FACTUAL_CONTENT_VERSION}:${FAMILIARITY_SCORING_VERSION}:${day}`,
      number: prepared.number,
      day,
      opensAt,
      closesAt: new Date(Date.parse(opensAt) + 86400000).toISOString(),
      roundSeconds: 30,
      kind: 'daily',
      practiceAllowed: true,
      scoringVersion: FAMILIARITY_SCORING_VERSION,
      prompts: prepared.questionIds.map((id) => {
        const q = factualQuestionById(id)!;
        return {
          id,
          q: q.q,
          sub: q.sub,
          format: 'factual' as const,
          answerCount: q.answers.length,
        };
      }),
    };
  },
};
