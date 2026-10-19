# Prepared daily content

This batch contains **100 new daily sets, 500 new prompts and 2,500 answer groups**, scheduled from **20 October 2026 to 27 January 2027** inclusive. The first opening is 00:00 UTC on 20 October (03:00 Cairo). The original #001 is retained before the new schedule begins, including its scores, aliases and same-day saves. New sets are numbered #002 through #101.

- [Readable 100-day calendar](100-day-calendar.md): five prompts per date, grouped by category.
- [Full CSV for editorial review](100-day-calendar.csv): prompts, answer groups, authored percentages and aliases.
- `src/data/prepared-questions.json`: versioned source of truth for the 500 new prompts and scoring groups.
- `src/data/challenge-calendar.json`: explicit date-to-question mapping, with stable IDs and no random generation at runtime.
- `npm run content:export`: regenerate the calendar and CSV after source edits.

## Editorial approach

Ten English-language categories contain 50 prompts each: food, home, technology, travel, social, everyday, work/school, leisure, nature and imagination. Sets alternate between two five-category mixes, and category order rotates so a category does not always appear in the same round. Every prepared prompt appears exactly once in the 100-day schedule.

Prompts use broadly relatable activities and family-friendly situations. They ask for a single free-text response rather than testing factual trivia. Five canonical answer groups and curated aliases support each prompt. Matching remains the original exact-after-normalization matcher, so an unlisted plausible answer still earns zero in this demo; this is not semantic answer validation.

**All percentages are authored demonstration weights. No audience survey was collected for this batch.** Five explicitly documented fixture profiles are used across the bank: 42/25/17/10/6, 38/28/17/11/6, 45/24/16/9/6, 40/26/18/10/6 and 36/29/19/11/5. These sum to 100 and provide useful Blend/Swerve/Sweet Spot choices, but are not claims about real players. Production should replace them with frozen reference distributions collected against the approved taxonomy and rerun score calibration.

The original scoring formulas, 30-second rounds and 2/2/1 token limits are unchanged. The app remains marked as a demo and permits demo replay. The content bank is bundled in the browser and visible in the public source; production should serve only the current prompts and authorized reveals from a backend.

## Schedule and versioning

The calendar uses UTC dates and is identical for players regardless of device timezone. Loading or starting a game resolves the date's set. An already-loaded round retains its prompt IDs and scoring bank across midnight; reloading resolves the next date. This matches the prototype's continuity behavior. Client clock changes are not prevented by this demo.

The first new date is deliberately the next UTC reset after this update was prepared, so today's existing challenge and scores are not replaced mid-day. Existing v2 saves remain date-keyed; v1 original-prompt saves are migrated only into #001. New sets score by their published prompt IDs, never by a shared five-question array index.

After 27 January the app shows “The next Swerve challenge is being prepared” until more dates are added. It does not silently repeat this bank. Add the next batch before that deadline. Keep published IDs, dates, questions and weights immutable; append new records and dates, then regenerate exports and rerun tests. The bank's current content version is `prepared-v1`.

## Validation

Tests check all 500 unique prompts, all 100 consecutive dates, category balance, no scheduled reuse, five groups per prompt, percentages, nonempty aliases, normalized matching collisions and every canonical/alias match. A full five-round game is exercised for each date, including correct day-specific scoring and persisted final results. Additional checks cover UTC boundaries, original-game compatibility, cross-midnight scoring, stale v1 migration and the exhausted-bank message.
