# Verified daily content

The scheduled bank now contains **109 source-backed questions**, using six published FiveThirtyEight survey datasets under **CC BY 4.0**. It replaces the invented 500-question bank. The calendar still provides **100 distinct daily sets / 500 round slots**, from **20 October 2026 to 27 January 2027** (#002–#101). **Questions repeat. This is not 500 unique verified questions.** The 19 October launch preview uses the first verified set.

The historical sources date to 2014–2015. These are recorded responses from the source datasets, not current public opinion, all Americans, or today's Swerve players. Exact field dates are unknown unless provided by the source; Thanksgiving explicitly documents 17 November 2015. No current or representative-population claim is made.

## Evidence and reproducibility

- [Verification ledger](survey-ledger.json): original wording/subheading, raw response → display label mapping, integer counts, item-specific valid/missing bases, population, date limits, weighting, transformations and pinned source URL for every question.
- [Audit summary](survey-audit.json): actual verified coverage and limitations.
- [Readable calendar](100-day-calendar.md) and [option-level CSV](100-day-calendar.csv): editorial review, with answer spoilers.
- [Audit notebook](survey-audit.ipynb): reproducible checks using the same pinned evidence.
- `content/surveys/`: original response CSVs, source READMEs, licence and SHA-256 manifest pinned to FiveThirtyEight commit `4c1ff5e3aef1816ae04af63218015066e186c147`. Raw respondent-level files stay outside the browser build.
- `content/survey-editorial.json`: reviewed single-response item selection and one-to-one wording/label adaptations. This contains no authored percentages.
- `scripts/import-surveys.py`: deterministic offline importer; rejects checksum drift, duplicate/invalid IDs, CSV width changes, unexpected metadata, unmapped responses, merged labels and items with fewer than 200 valid answers. This threshold is an editorial floor, not evidence of representativeness.

```bash
npm run content:import   # Rebuild scoring groups, calendar, ledger, credits and audit
npm run content:export   # Refresh editorial CSV/calendar
npm run content:check    # Importer regression checks + byte-for-byte generated drift check
npm run check           # Evidence checks, TypeScript, game/service tests, production build
npm run test:e2e         # Chromium at 320px, 390px and desktop
```

Python 3.10+ is needed for the evidence importer/checks; runtime hosting remains a static Vite build. The importer uses only Python's standard library. It makes no network requests and needs no API key.

## Calculation policy

Each choice has `pct = 100 × recorded count / nonblank answers to that exact item`. Calculations are **unweighted response frequencies**. They are not presented as a reproduction of a weighted percentage in an accompanying article. Missing/skipped answers are excluded, never converted to “No”. “Unfamiliar” is retained where it was an explicit choice. The extra metadata rows in the Star Wars and steak files are excluded from respondent counts.

Only mutually exclusive, single-response items are selected. Film ranking columns ask for one ordinal rank per film; they are not combined into an invented overall preference question. Checkbox blocks are excluded: their independent selection rates must not be normalized into a 100% choice distribution. No fake respondents, demographic extrapolation, synthetic percentages or pairwise questions inferred from unrelated answers are used.

Labels shorten wording without merging categories. The cuisine rating meaning comes from the source's README answer key. Oxford comma choices have explicit “With Oxford comma” and “Without Oxford comma” labels because the text matcher removes punctuation; silently merging the two sentences would be wrong. All canonical labels and aliases are checked against the existing normalized matcher for ambiguity.

Scores use the full computed fraction. Display rounds to one decimal, so displayed shares need not total exactly 100%. Percentages are never capped at 48% or adjusted to make the strategies easier. The original Blend/Swerve/Sweet Spot formulas, 30-second timer and 2/2/1 token limits are unchanged. Available options vary by the actual question, rather than forcing five groups.

## Player presentation and attribution

Play screens say “reference group”, show the historical year and valid-answer count, and offer actual response choices. They make no live-voting claim and do not prominently announce “published surveys”. Reveal screens link to the relevant source details. A small Data credits link provides FiveThirtyEight attribution, the CC BY 4.0 link, modifications, original wording, counts and methodological limits. Attribution remains accessible as required by the source licence.

This is still a local scoring implementation with guest identity, browser-editable scores and optional practice replay; real accounts, authoritative scoring and a trusted clock require the planned backend. The reference content is real; that does not make the client a trustworthy competitive server.

## Versioning and continuity

Content version `surveys-v1` uses challenge IDs `reference-surveys-v1-YYYY-MM-DD`. Old invented-bank saves cannot attach to the replacement questions. Existing old saves are retained in storage, not silently reinterpreted or overwritten. The original fixture is available only for pre-launch dates, explicitly marked as demo, and is retained for regression coverage. The launch preview intentionally replaces the invented current-day set, so that day's old scores are not comparable.

UTC selection and cross-midnight pinning are unchanged: an already loaded attempt finishes against its original question IDs; a fresh load resolves the next date. After the final prepared date, the app shows a preparation message. It never silently loops the calendar. Daily sets intentionally reuse the verified pool as disclosed above.

Freeze published evidence and scoring versions. To add genuinely new questions, first verify reuse rights, source wording, date/population, weighting and valid denominators; add pinned evidence and an exhaustive editorial mapping; regenerate, review the ledger and run checks. Do not fill missing coverage with authored weights. To change a published distribution, introduce a new content version and update the version constant and challenge IDs together.
