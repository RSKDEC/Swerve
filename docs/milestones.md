# Development milestones

## 1 — Understand and preserve the prototype

Inspected all three original files, including every prompt, alias, scoring formula, timer handler and navigation path. Confirmed `index.html` as the working implementation. `check.js` failed syntax checking and had drifted from it. Extracted the original data and scoring without changing their values, then tested every alias and representative score boundaries.

See [the audit](prototype-audit.md) for the behavior map and compatibility decisions.

## 2 — Separate game rules, state and effects

Added TypeScript and Vite with no runtime UI framework. Moved the answer bank and rules out of the UI, introduced explicit attempt phases, added challenge/player/attempt repositories, and made screen renderers independent of storage and scoring. Completed-round submission is idempotent in the local service. Replaced the duplicate script with domain and service tests.

Added a replaceable HTTP client whose submission payload contains only answer, mode and round index, with a stable idempotency key. The proposed server owns identity, time, tokens, matching and scores; the client validates response structure. This is preparation, not a deployed backend.

## 3 — Improve continuity and mobile interaction

Versioned saves preserve active deadlines, answers, strategy and reveal state. The app validates old/corrupt saves, migrates valid legacy rounds, recovers from blocked storage, and reconciles sequential changes from other tabs. Refresh does not grant another 30 seconds.

Help became a focus-managed native dialog; the clock continues behind it. Submission checks the exact deadline, timeout chooses the original fallback token, and failed remote timeout submission remains retryable. Added labels, strategy pressed states, 44px targets, safe-area spacing, a keyboard submit hint, reduced motion, targeted timer announcements and explicit error messages.

Kept the original palette, layout and font families, bundling fonts locally. Added vector arrow icons so the Swerve mark does not depend on OS glyph availability. Visual review caught a sticky-action overlap at small phone heights; the action now stays in document flow, and browser tests verify unobstructed strategy controls and answer/submit geometry.

Sharing remains spoiler-free, now marks demo results explicitly, respects native-share cancellation, and provides manual copy when clipboard access fails. Replay uses a confirmation dialog.

## 4 — Verification and handoff

Browser tests cover phone (390×844), small phone (320×568) and desktop (1280×900). Screenshots were inspected during the mobile pass. All browser checks use Chromium; no claim is made about physical device keyboard behavior or Safari compatibility.

| Check                                   | Result                       |
| --------------------------------------- | ---------------------------- |
| TypeScript strict checking              | Passed                       |
| Domain, storage and HTTP contract tests | 19 passed                    |
| Browser regression scenarios            | 18 passed across 3 viewports |
| Production static build                 | Passed                       |

The API-configured build also passed; inspection confirmed that its emitted JavaScript excludes the demo question/alias fixtures. A GitHub Actions workflow is included to run the checks on future pushes and pull requests; it has not been run on a remote repository in this session.

Visual evidence: [phone home screen](screenshots/mobile-home.png) and [small-phone round](screenshots/small-mobile-round.png).

The complete game regression produces **437/500** for: Blend/phone, Swerve/wine, Sweet Spot/wallet, Swerve/book, Blend/keys. It checks all five reveals, exact token exhaustion, persisted final results, spoiler-free copying and confirmed replay.

Other checks cover blank and unknown answers, exact deadline boundary, typed-answer timeout, no-strategy fallback, refresh/draft continuity, expiry while help is open, duplicate submission, stale attempt rejection, UTC rollover, legacy migration, malformed saves, blocked storage, HTTP payloads/clock/error responses, clipboard failure, HTML escaping, keyboard submission and modal focus return.

Remaining production work is explicit in [the backend contract](backend-contract.md): real challenge scheduling, validated and frozen reference distributions, authenticated guest/account sessions, transactional daily locks, authoritative scoring and account linking. None of those are simulated as live services in this release.

## 5 — Prepare 100 new daily challenges

Added 500 new, distinct English-language prompts across ten categories, with five authored answer groups and curated aliases for every prompt. The explicit calendar assigns each prompt exactly once across 100 days, from 20 October 2026 through 27 January 2027. Categories rotate within daily sets. A readable calendar and a 500-row CSV export support editorial review; the original #001 remains available before the first new date.

The demo service now scores using each published prompt ID rather than an index in the original fixed five-question array. This preserves the scoring bank for a round crossing midnight. Old v1 saves migrate only into the original set, so they cannot attach an old score to a different prepared question. All percentages remain authored demonstration weights; no survey is implied. The bank ends with an explicit preparation message instead of quietly repeating old content.

Validation: **25 unit/service tests** passed, including a full five-round game for every one of the 100 dates. **24 browser scenarios** passed across mobile, small-phone and desktop viewports, covering the original game plus the first/last prepared sets, UTC rollover, share numbering, draft restoration and exhaustion. Strict type checking and the production build passed. Review the [content guide](content/README.md) and [calendar](content/100-day-calendar.md) for the exact schedule and publication assumptions.

## 6 — Replace illustrative content with source evidence

The previous milestone's invented answer weights are retired from the scheduled game. The replacement contains 109 single-response questions from six FiveThirtyEight survey datasets (2014–2015), pinned to an upstream commit with SHA-256 hashes and CC BY 4.0 documentation. Every percentage is an unweighted count divided by that item's valid-answer base, with metadata rows and missing answers handled explicitly. A ledger preserves original wording, source options, counts, denominators and transformations.

The 100-day calendar remains, using 100 distinct mixes and 500 round slots; questions repeat. This intentionally retracts the earlier implication of 500 unique source-backed questions. Future expansion must pass the same evidence gate. No fabricated people or answer shares fill missing coverage.

Play screens show dated reference groups and actual choices, while a small credits link carries attribution and detailed methodology. Versioned IDs prevent old illustrative scores from attaching to new questions. The timer, 2/2/1 strategies, original formulas, saved progress, results, sharing and confirmed practice replay remain. The original demo regression still scores 437/500. Evidence importer tests and full-game checks cover every scheduled set; browser checks cover the new choices/credits and existing regression flows.

## 7 — Gather toward a full year without repeating questions

This first collection batch adds 201 reviewed questions: 121 Young People Survey items (CC0), 61 official weighted travel distributions and 19 official community count distributions (OGL). The total is 310, enough for 62 full unique days. The one-year target remains 1,825, so 1,515 more are required. The source catalogue records promising but unaudited/blocked collections separately.

The previous repeating calendar is retired. A permanent registry locks each question's identity, assigned concept, original-wording fingerprint and scoring digest once; regeneration preserves reservations and appends only fresh items. The first launch set remains intact. Spreadsheet readers preserve merged cells, validate response header blocks and distinguish weighted shares from raw person counts. Original numeric-only scale points are not assigned invented meanings. The original timer, strategies, persistence, reveals, sharing and explicit practice replay remain covered by regressions.
