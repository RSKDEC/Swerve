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
const escape = (value: string | number | null) =>
  `"${String(value ?? '').replaceAll('"', '""')}"`;
const columns = [
  'date_utc',
  'challenge',
  'round',
  'question_id',
  'category',
  'prompt',
  'source_url',
  'basis',
  'concept_key',
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
  '# Swerve unique-question calendar',
  '',
  `**${FIRST_PREPARED_DAY} through ${LAST_PREPARED_DAY}, inclusive.** ${PREPARED_DAYS.length} daily sets / ${PREPARED_DAYS.length * 5} round slots from ${PREPARED_QUESTIONS.length} verified questions. No question repeats. One-year target: 1,825.`,
  '',
  'Historical reference data from FiveThirtyEight, Miroslav Sabo, and UK government surveys. Each item identifies count-based or official weighted shares. See Data credits for CC BY 4.0, CC0 and OGL attribution. Not current Swerve player votes. A permanent reservation registry prevents reuse.',
  '',
  'Source counts, denominators, original wording and transformations are in [the verification ledger](survey-ledger.json). The [CSV](challenge-calendar.csv) has one row per answer option per scheduled round. These files contain answer spoilers.',
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
          q.source.basis ?? 'responses',
          q.conceptKey,
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
const inventory = [
  [
    'question_id',
    'concept_key',
    'category',
    'prompt',
    'year',
    'base',
    'basis',
    'source_url',
    'choices_and_shares',
  ]
    .map(escape)
    .join(','),
];
for (const q of PREPARED_QUESTIONS)
  inventory.push(
    [
      q.id,
      q.conceptKey,
      q.category,
      q.q,
      q.source.year,
      q.source.n,
      q.source.basis ?? 'responses',
      q.source.url,
      JSON.stringify(q.groups.map(({ name, pct }) => ({ name, pct }))),
    ]
      .map(escape)
      .join(','),
  );
for (const [name, text] of [
  ['question-inventory.csv', `${inventory.join('\n')}\n`],
  ['challenge-calendar.csv', `${csv.join('\n')}\n`],
  ['challenge-calendar.md', `${markdown.join('\n').trimEnd()}\n`],
  ['100-day-calendar.csv', `${csv.join('\n')}\n`],
  [
    '100-day-calendar.md',
    '# Calendar moved\n\nSee [the current nonrepeating calendar](challenge-calendar.md). The historical filename no longer describes coverage.\n',
  ],
]) {
  const path = `${directory}${name}`;
  if (process.argv.includes('--check')) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text)
      throw new Error(`Stale ${name}; run npm run content:export.`);
  } else writeFileSync(path, text);
}
console.log(
  `Exported ${PREPARED_DAYS.length} days / ${PREPARED_QUESTIONS.length} verified questions (zero repeats) to docs/content/.`,
);
