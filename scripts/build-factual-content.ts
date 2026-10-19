import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  attentionIndex,
  familiarityPoints,
  normalizeFactual,
} from '../src/domain/familiarity.ts';
import type { FactualQuestion } from '../src/domain/types.ts';

type Catalog = {
  version: string;
  startDay: string;
  viewWindow: { start: string; end: string; days: number };
  questions: {
    id: string;
    q: string;
    sub: string;
    sourceArticle: string;
    answers: { name: string; article: string; aliases: string[] }[];
  }[];
};
type Evidence = {
  version: string;
  window: Catalog['viewWindow'];
  project: string;
  access: string;
  agent: string;
  canonical: Record<string, string>;
  sources: Record<string, { title: string; revision: number; url: string }>;
  articles: Record<
    string,
    { url: string; views: number; daily: [string, number][] }
  >;
};
const catalog = JSON.parse(
  readFileSync('content/factual/catalog.json', 'utf8'),
) as Catalog;
const bytes = readFileSync('content/factual/evidence.json');
const evidence = JSON.parse(bytes.toString()) as Evidence;
const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};
assert(
  createHash('sha256').update(bytes).digest('hex') ===
    readFileSync('content/factual/evidence.sha256', 'utf8').trim(),
  'Evidence checksum mismatch',
);
assert(
  evidence.version === catalog.version &&
    JSON.stringify(evidence.window) === JSON.stringify(catalog.viewWindow),
  'Mismatched evidence snapshot',
);
assert(
  evidence.project === 'en.wikipedia' &&
    evidence.access === 'all-access' &&
    evidence.agent === 'user',
  'Wrong attention measure',
);
const start = Date.parse(
  catalog.viewWindow.start.slice(0, 4) +
    '-' +
    catalog.viewWindow.start.slice(4, 6) +
    '-' +
    catalog.viewWindow.start.slice(6, 8) +
    'T00:00:00Z',
);
const expectedDays = Array.from(
  { length: catalog.viewWindow.days },
  (_, i) =>
    new Date(start + i * 86400000)
      .toISOString()
      .slice(0, 10)
      .replaceAll('-', '') + '00',
);
assert(expectedDays.at(-1) === catalog.viewWindow.end, 'Incorrect date window');
for (const [title, article] of Object.entries(evidence.articles)) {
  assert(
    article.url.startsWith(
      'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/',
    ),
    `Wrong evidence endpoint: ${title}`,
  );
  assert(
    article.daily.length === expectedDays.length &&
      article.daily.every(
        ([date, count], i) =>
          date === expectedDays[i] && Number.isSafeInteger(count) && count >= 0,
      ),
    `Incomplete daily evidence: ${title}`,
  );
  assert(
    article.views === article.daily.reduce((sum, [, count]) => sum + count, 0),
    `Bad sum: ${title}`,
  );
}
const questions: FactualQuestion[] = catalog.questions.map((q) => {
  const rows = q.answers.map((a) => {
    const title =
      evidence.canonical[decodeURIComponent(a.article).replaceAll('_', ' ')];
    const data = evidence.articles[title];
    assert(!!data, `Missing attention evidence: ${a.name}`);
    return {
      ...a,
      article:
        'https://en.wikipedia.org/wiki/' +
        encodeURIComponent(title.replaceAll(' ', '_')),
      views: data.views,
    };
  });
  assert(
    new Set(rows.map((a) => a.article)).size === rows.length,
    `Answers share an article: ${q.id}`,
  );
  const views = rows.map((a) => a.views);
  const answers = rows.map((a) => ({
    ...a,
    index: attentionIndex(views, a.views),
    rank: 1 + views.filter((v) => v > a.views).length,
  }));
  const keys = new Map<string, string>();
  for (const a of answers)
    for (const alias of [a.name, ...a.aliases]) {
      const key = normalizeFactual(alias);
      assert(
        !!key &&
          alias.length <= 70 &&
          (!keys.has(key) || keys.get(key) === a.name),
        `Ambiguous alias: ${q.id}: ${alias}`,
      );
      keys.set(key, a.name);
    }
  assert(answers.length >= 5, `Too few answers: ${q.id}`);
  for (const mode of ['blend', 'swerve', 'sweet'] as const)
    assert(
      answers.some((a) => familiarityPoints(mode, a.index) === 100),
      `No perfect ${mode} answer: ${q.id}`,
    );
  assert(
    evidence.sources[q.id]?.url.startsWith(
      'https://en.wikipedia.org/w/index.php?oldid=',
    ),
    `Missing pinned facts: ${q.id}`,
  );
  assert(
    evidence.sources[q.id].title === q.sourceArticle.replaceAll('_', ' '),
    `Factual source scope changed: ${q.id}`,
  );
  return {
    id: 'facts-' + q.id,
    q: q.q,
    sub: q.sub,
    sourceUrl: evidence.sources[q.id].url,
    answers,
  };
});
assert(
  new Set(questions.map((q) => q.id)).size === questions.length &&
    new Set(questions.map((q) => normalizeFactual(q.q))).size ===
      questions.length,
  'Repeated question',
);
const calendar = Array.from(
  { length: Math.floor(questions.length / 5) },
  (_, i) => ({
    number: String(i + 1).padStart(3, '0'),
    day: new Date(Date.parse(catalog.startDay + 'T00:00:00Z') + i * 86400000)
      .toISOString()
      .slice(0, 10),
    questionIds: questions.slice(i * 5, i * 5 + 5).map((q) => q.id),
  }),
);
const registry = calendar.map((day) => ({
  ...day,
  digests: day.questionIds.map((id) =>
    createHash('sha256')
      .update(JSON.stringify(questions.find((q) => q.id === id)))
      .digest('hex'),
  ),
}));
// Once scheduled, do not silently replace questions, evidence or scores. New content appends.
if (existsSync('content/factual/publication-registry.json')) {
  const old = JSON.parse(
    readFileSync('content/factual/publication-registry.json', 'utf8'),
  ) as typeof registry;
  assert(
    old.every((day, i) => JSON.stringify(day) === JSON.stringify(registry[i])),
    'A reserved factual day changed. Use a new, explicitly retired pilot version for scoring corrections.',
  );
}
const outputs: Record<string, string> = {
  'src/data/factual-questions.json': JSON.stringify(questions, null, 2) + '\n',
  'src/data/factual-calendar.json': JSON.stringify(calendar, null, 2) + '\n',
  'content/factual/publication-registry.json':
    JSON.stringify(registry, null, 2) + '\n',
};
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
outputs['public/factual-credits.html'] =
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Swerve · Answer sources and scoring</title><style>body{background:#141625;color:#eee;font:16px/1.6 system-ui;max-width:760px;margin:auto;padding:24px}a{color:#bfe481}summary{cursor:pointer;padding:12px 0}li{overflow-wrap:anywhere}details{border-bottom:1px solid #444}small{color:#bbb}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:6px}th{font-size:13px}h1{line-height:1.2}</style><a href="./">← Back to Swerve</a><h1>Answer sources and scoring</h1><p>This pilot has ${questions.length} factual prompts across ${calendar.length} days. The survey collection is retired from the current game.</p><h2>What the index measures</h2><p>English Wikipedia article views, all access, user traffic, 1 July–30 September 2026 (92 days). These are recorded article requests, not unique people or survey answers. Bots classified by Wikimedia are excluded by the user filter. Redirects, news events, language, and audience differences can affect attention; this index is a proxy, not a measure of what everyone knows.</p><p>Within each question, answers are ranked from least viewed (index 0) to most viewed (100), with tied counts sharing their average rank. Indices are independent and do not add up to 100. Displayed indices are rounded; scores use the unrounded rank. The snapshot is frozen for the entire challenge; today's players cannot change your score.</p><h2>Points</h2><p>Every listed correct answer earns 20 points plus up to 80 strategy points. Blend: 20 + 0.8 × index. Swerve: 100 − 0.8 × index. Sweet Spot: 100 in the 40–60 band, falling by 2 points per index step outside it to a minimum of 20. Round only the final score. Blank, timed-out and unlisted answers earn zero. There is no speed bonus, random jackpot or live AI judging.</p><p>Aliases are reviewed exact matches after case, accent, apostrophe and punctuation normalization. We do not guess near spellings. The lists are curated; omissions remain possible. An unlisted answer is not automatically factually wrong. This local pilot has no submission-review service or competitive leaderboard.</p><h2>Sources and reuse</h2><p>Prompts are original editorial wording. Factual membership lists link to pinned Wikipedia revisions, with Wikipedia contributors credited; source text is licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA</a>. Wikimedia aggregate pageview data is available under <a href="https://dumps.wikimedia.org/other/pageviews/readme.html">CC0</a>. See the <a href="https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/">Wikimedia Analytics API</a>. This project is independent of Wikipedia, Nintendo, Disney and other referenced brands.</p><h2>Question evidence (contains answers)</h2>${questions
    .map(
      (q) =>
        `<details id="${esc(q.id)}"><summary>${esc(q.q)}</summary><p>${esc(q.sub)}</p><p><a href="${esc(q.sourceUrl)}">Factual scope · Wikipedia contributors · pinned revision</a></p><table><thead><tr><th>Accepted answer</th><th>Views</th><th>Index</th></tr></thead><tbody>${q.answers
          .toSorted((a, b) => b.index - a.index)
          .map(
            (a) =>
              `<tr><td><a href="${esc(a.article)}">${esc(a.name)}</a></td><td>${a.views.toLocaleString('en-US')}</td><td>${Math.round(a.index)}</td></tr>`,
          )
          .join('')}</tbody></table></details>`,
    )
    .join(
      '',
    )}<script>function openHash(){const e=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(e instanceof HTMLDetailsElement)e.open=true}openHash();addEventListener('hashchange',openHash)</script></html>\n`;
for (const [path, content] of Object.entries(outputs)) {
  if (process.argv.includes('--check'))
    assert(
      existsSync(path) && readFileSync(path, 'utf8') === content,
      `Generated factual content is stale: ${path}`,
    );
  else writeFileSync(path, content);
}
console.log(
  `${questions.length} factual questions, ${calendar.length} unique daily sets, ${questions.reduce((sum, q) => sum + q.answers.length, 0)} accepted answers; frozen attention evidence verified.`,
);
