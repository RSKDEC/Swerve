import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  PREPARED_DAYS,
  PREPARED_QUESTIONS,
  FIRST_PREPARED_DAY,
  LAST_PREPARED_DAY,
} from '../src/data/challenge-bank.ts';

const directory = fileURLToPath(new URL('../docs/content/', import.meta.url));
mkdirSync(directory, { recursive: true });
const questions = new Map(PREPARED_QUESTIONS.map((q) => [q.id, q]));
const escape = (value: string | number) =>
  `"${String(value).replaceAll('"', '""')}"`;
const columns = [
  'date_utc',
  'challenge',
  'round',
  'question_id',
  'category',
  'prompt',
  'crowd_data',
  ...Array.from({ length: 5 }, (_, i) => [
    `answer_${i + 1}`,
    `sample_pct_${i + 1}`,
    `aliases_${i + 1}`,
  ]).flat(),
];
const csv = [columns.map(escape).join(',')];
const markdown = [
  `# 100-day Swerve content calendar`,
  '',
  `**${FIRST_PREPARED_DAY} through ${LAST_PREPARED_DAY}, inclusive.** Five new prompts per day, 500 in total. All percentages are authored demo weights, not survey results.`,
  '',
  'The original #001 remains unchanged before the schedule starts. Prepared sets are numbered #002–#101. Dates use UTC; the first set opens at 03:00 Cairo time on 20 October 2026. Future Cairo reset times follow local daylight-saving changes.',
  '',
  'Full answer groups and aliases are in [the CSV export](100-day-calendar.csv) and the versioned source JSON files. This document contains prompt spoilers.',
  '',
];
for (const day of PREPARED_DAYS) {
  markdown.push(`## #${day.number} · ${day.day}`, '');
  day.questionIds.forEach((id, i) => {
    const q = questions.get(id)!;
    markdown.push(`${i + 1}. **${q.category}:** ${q.q}`);
    csv.push(
      [
        day.day,
        `#${day.number}`,
        i + 1,
        q.id,
        q.category,
        q.q,
        'authored-demo',
        ...q.groups.flatMap((g) => [g.name, g.pct, g.aliases.join(' | ')]),
      ]
        .map(escape)
        .join(','),
    );
  });
  markdown.push('');
}
writeFileSync(`${directory}100-day-calendar.csv`, `${csv.join('\n')}\n`);
writeFileSync(`${directory}100-day-calendar.md`, `${markdown.join('\n')}\n`);
console.log(
  `Exported ${PREPARED_DAYS.length} days / ${PREPARED_QUESTIONS.length} prompts to docs/content/.`,
);
