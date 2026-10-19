> **Archived survey collection:** The active game now uses factual open-answer prompts. The 310 items and 62 days below describe the retired survey format, not current playable inventory. See [the current design](../factual-game.md).

# Growing the one-year question bank

**Target: 1,825 verified, nonrepeating questions = 365 days at five questions per day.**

The first expansion contains **310 approved questions**, up from 109. That is **62 full daily sets (310 questions)**. **1,515 more approved questions are still needed for the year goal.** The current unique calendar runs from **19 October to 19 December 2026**, numbered #001–#062. It is deliberately shorter than the old repeating calendar: no repeated questions fill missing coverage.

## This batch

| Collection                                                   | Approved questions | Basis                              | Reuse licence |
| ------------------------------------------------------------ | -----------------: | ---------------------------------- | ------------- |
| Six FiveThirtyEight datasets                                 |                109 | Unweighted recorded responses      | CC BY 4.0     |
| Miroslav Sabo's Young People Survey (2013, version 2)        |                121 | Unweighted recorded responses      | CC0 1.0       |
| National Travel Attitudes Study (2019–2020), seven workbooks |                 61 | Official weighted percentage cells | OGL v3.0      |
| Community Life Survey 2024/25                                |                 19 | Published unweighted option counts | OGL v3.0      |
| **Total**                                                    |            **310** |                                    |               |

The 201 additions cover music and film preferences, hobbies, procrastination, punctuality, social habits, spending, travel choices, and neighbourhood/community experiences. The Young People source is a **Slovak convenience sample**, mostly recruited through students and friends, with recorded ages 15–30; it is not representative of all young people. Seven ages are missing. The author supplied an English translation of the Slovak questionnaire. Government items identify their England population and historical year. None are today's Swerve player votes.

Intermediate scale points are never silently labelled “neutral”, “somewhat agree”, or similar if the source supplied only numeric intermediate values. Original question dictionaries take precedence over misleading abbreviated CSV headers: for example, the source column `Healthy eating` actually asks about a healthy **lifestyle**.

## Files to review

- [Progress and calculation audit](survey-audit.json): current verified coverage, remaining target, dates, categories and source count.
- [Question inventory](question-inventory.csv): every approved question, including all calendar reservations.
- [Unique calendar](challenge-calendar.md) and [option-level calendar CSV](challenge-calendar.csv).
- [Verification ledger](survey-ledger.json): original wording/subheading, exact counts or weighted percentages, bases, missingness limits, source file hashes, transformations, and spreadsheet coordinates.
- [Known source issues and decisions](source-issues.md): conflicting global totals, abbreviated wording, true zero frequencies and unknown missingness.
- [Executed audit notebook](survey-audit.ipynb): reproducible inspection of evidence and the reservation registry.
- `content/source-catalog.json`: approved, held, blocked and rights-review collections. **Candidates and reported collection sizes are not counted as prepared game questions.**
- `content/young-people-review.json`: all 150 source items; 121 approved and 29 excluded from this batch; an explicitly offered zero-frequency option is retained faithfully.
- `content/government-review.json`: 119 travel candidates, 61 approved and 58 excluded as duplicated/rephrased, demographic variants, incomplete stems or unsuitable detail; plus 19 approved community questions.
- `content/survey-editorial.json`: explicit reviewed item selection, display adaptations, stable editorial concept keys, and numeric source references. It contains no invented percentages.
- `content/surveys/`: original response CSVs, question dictionaries, metadata and ODS evidence, protected by SHA-256 checks. The original FiveThirtyEight files remain pinned to commit `4c1ff5e3aef1816ae04af63218015066e186c147`. New sources are pinned by file hashes and original download URLs.

The historical `100-day-calendar.md` points to the new calendar. The historical CSV filename is a compatibility alias containing the current nonrepeating calendar, not a claim of 100 prepared days.

## No-repeat publication policy

`content/publication-registry.json` reserves each question once, with a date, challenge number, source wording fingerprint, editorial concept key and digest of its prompt/answer groups. Generation retains existing reservations and appends only previously unused items. It never wraps the pool to fill dates. Fewer than five remaining questions stay unreserved until more material is approved.

The checks reject repeated question IDs, exact normalized original wording (including battery targets), repeated assigned concepts, conflicting reservation dates and changed reserved scoring content. **A new year, demographic breakdown, reverse wording, or paraphrase does not make the same underlying question new.** Editorial review must assign the same concept key to these variants. Exact-match/fingerprint checks cannot establish semantic uniqueness by themselves; human-level editorial review remains necessary. Distinct measured targets in a source battery, such as different cuisines, characters or music genres, retain distinct item identities.

The 19 October launch set is preserved from the earlier source-backed version. Future repeating reservations were replaced before this batch's publication. New content uses `surveys-v2-unique` challenge IDs, so old repeated-bank scores cannot attach to new questions. Once published/reserved, questions stay immutable; corrections require an explicit reviewed version policy and must not be counted as fresh inventory.

Practice replay is explicitly user-selected replay of the same challenge; it does not reserve or advertise new daily questions. The permanent reservation rule applies to the daily calendar.

## Calculation and spreadsheet policy

An explicitly offered questionnaire option with no recorded selections retains a genuine zero. It is a valid listed choice, unlike unrecognized free text. Such options require a reviewed offered-value list backed by the original questionnaire; observed response codes alone cannot authorize invented extra choices.

For raw-response and published-count items, `pct = 100 × recorded option count / valid item response base`. Missing values are excluded, never converted to “No”. Every count distribution must reconcile exactly with its item base. Grouped/subtotal rows are excluded. No checkbox selection rates are renormalized into a mutually exclusive distribution, and checkbox options are not split into new questions to pad coverage.

For travel items, the source provides official **weighted percentages** and an **unweighted sample base**. We copy full-precision numeric percentage cells and keep `count: null` for options. Multiplying a weighted percentage by the unweighted base would invent person counts, so the importer never does that. These shares must already sum to 100 within numeric tolerance. Published precision is retained for scoring; UI display rounds to one decimal.

ODS parsing preserves merged/covered cells and repeated-cell coordinates. Each travel item names its nearest response header block; spreadsheet groups can change scales within a sheet. Multi-row headers, including climate-change response stems, are explicitly mapped. Source labels, context and positions are checked rather than guessed from adjacent tables. Nonresponses/ineligible cases are recorded when the table supplies them. For community tables, total omissions outside the valid base are unknown and remain null, not an invented zero.

Minimum valid item base remains 200 for this batch, an editorial floor rather than a claim of representativeness. No missing responses are imputed, no synthetic respondents are generated, and percentages are not capped or adjusted to suit the strategy formulas.

## Commands and validation

Use Node 22.18+ (24 recommended) and Python 3.10+. Python readers use only the standard library; runtime hosting remains static.

```bash
npm run content:import   # Rebuild from pinned sources; preserve reservations and append fresh items
npm run content:export   # Refresh inventory and readable/CSV calendars
npm run content:check    # Source, registry, parser and calculation checks; generated-file drift
npm run check           # Evidence checks, TypeScript, full game/service tests and production build
npm run test:e2e         # Small-mobile, mobile and desktop Chromium regressions
```

The 30-second timer, 2 Blend / 2 Swerve / 1 Sweet Spot tokens, original formulas, deadline-preserving saves, reveals, sharing and practice replay remain. All scheduled sets are exercised through complete games. A future backend must enforce the same question uniqueness and scoring snapshots in a database; browser-editable scores are not authoritative competition results.

## Remaining sourcing work

The source catalogue records the next collections to investigate rather than presenting them as ready inventory. Food and You has a useful public catalogue, but its published Azure download host returned a tunnel 403. SAPA's authors document a CC0 dataset with 696 items, but Harvard Dataverse returned 403 here; neither its raw items nor response codes have been audited. Those collection sizes are not game question counts. Participation and public-attitudes-to-science sources need further item-level acquisition/review. NORC/GSS and OpenPsychometrics need source-specific reuse-rights review. No blocked download or unclear licence has been bypassed or treated as approval.

The one-year goal remains in progress. Add independently sourced, worthwhile questions through the same review and evidence checks; do not reach the target by repeating existing questions or counting unverified candidates.
