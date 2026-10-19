import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  PREPARED_DAYS,
  PREPARED_QUESTIONS,
  FIRST_PREPARED_DAY,
  LAST_PREPARED_DAY,
} from '../src/data/challenge-bank.ts';
import ledger from '../docs/content/survey-ledger.json' with { type: 'json' };

const directory = fileURLToPath(new URL('../docs/content/', import.meta.url));
mkdirSync(directory, { recursive: true });
const questions = new Map(PREPARED_QUESTIONS.map((q) => [q.id, q]));
const evidence = new Map(ledger.map((e) => [e.questionId, e]));
const escape = (value: string | number) =>
  `"${String(value).replaceAll('"', '""')}"`;
const columns = [
  'date_utc',
  'challenge',
  'round',
  'question_id',
  'category',
  'prompt',
  'source_url',
  'year',
  'valid_answers',
  'missing_answers',
  'original_response',
  'display_label',
  'count',
  'pct_unrounded',
  'aliases',
];
const csv = [columns.map(escape).join(',')];
const markdown = [
  '# 100-day Swerve content calendar',
  '',
  `**${FIRST_PREPARED_DAY} through ${LAST_PREPARED_DAY}, inclusive.** 100 distinct daily sets / 500 round slots, using ${PREPARED_QUESTIONS.length} verified questions. Questions repeat.`,
  '',
  'Historical FiveThirtyEight response data (2014–2015), CC BY 4.0. Unweighted valid-answer frequencies, not current public opinion or Swerve player votes. Launch preview on 19 October uses the first verified set. Prepared sets remain #002–#101.',
  '',
  'Source counts, denominators, original wording and transformations are in [the verification ledger](survey-ledger.json). The [CSV](100-day-calendar.csv) has one row per answer option per scheduled round. These files contain answer spoilers.',
  '',
];
for (const day of PREPARED_DAYS) {
  markdown.push(`## #${day.number} · ${day.day}`, '');
  day.questionIds.forEach((id, i) => {
    const q = questions.get(id)!;
    const e = evidence.get(id)!;
    markdown.push(
      `${i + 1}. **${q.category}:** ${q.q} (${q.source.year}, n=${q.source.n}; ${id})`,
    );
    q.groups.forEach((g) => {
      const o = e.options.find((o) => o.label === g.name)!;
      csv.push(
        [
          day.day,
          `#${day.number}`,
          i + 1,
          q.id,
          q.category,
          q.q,
          q.source.url,
          q.source.year,
          q.source.n,
          e.missingAnswers,
          o.raw,
          g.name,
          o.count,
          g.pct,
          g.aliases.join(' | '),
        ]
          .map(escape)
          .join(','),
      );
    });
  });
  markdown.push('');
}
for (const [name, text] of [
  ['100-day-calendar.csv', `${csv.join('\n')}\n`],
  ['100-day-calendar.md', `${markdown.join('\n').trimEnd()}\n`],
]) {
  const path = `${directory}${name}`;
  if (process.argv.includes('--check')) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text)
      throw new Error(`Stale ${name}; run npm run content:export.`);
  } else writeFileSync(path, text);
}
console.log(
  `Exported ${PREPARED_DAYS.length} days / ${PREPARED_QUESTIONS.length} verified questions (with repeats) to docs/content/.`,
);
