# Current factual game architecture

The browser boots with `factualChallenges`, which publishes prompt text, scope and accepted-answer counts without choices or scoring keys. `factual-bank.ts` loads generated, typed answer data. The same `DemoClient`, repositories and controller retain the timer, tokens, drafts, idempotent submissions, persistence, help, sharing and replay flow. Dates before the factual launch retain the original fixture for compatibility.

`domain/familiarity.ts` owns normalization, reviewed exact alias matching, tie-aware attention ranks, strategy scoring and validation of factual results. A result has an optional `familiarity` reveal and omits `pct`; old survey results keep their percentage fields. New challenge IDs include `factual-v1:attention-v1`, isolating saves from every survey/demo scoring version. Loaded challenges stay pinned across midnight.

The factual evidence generator runs offline during `npm run check`. It verifies the source hash, complete date sequence, daily sums, canonical article mappings, alias collisions, unique prompts, immutable day reservations and that every question offers a 100-point answer for each strategy. The source refresh is explicit and never changes a running challenge.

See [design, formulas, provenance and limits](factual-game.md). This remains a local, noncompetitive pilot. An API-backed deployment must own answer keys, deadlines, scoring snapshots and atomic submissions. The existing HTTP client now accepts and validates factual metadata/results as well as historical survey data.

The following describes the preserved prototype and historical survey implementation. Its 310-question/62-day inventory is archived and is not the active calendar.

---

# Application architecture

The application stays framework-free: TypeScript ES modules and Vite provide structure, type checking and a small static build without rewriting the game around a larger UI framework.

```text
index.html + styles
       ↓
ui/controller → screen renderers + shared HTML helpers
       ↓
GameClient interface
       ├─ DemoClient → challenge / player / attempt repositories
       │                   ↓                 ↓
       │             dated demo bank   validated localStorage
       │                   ↓
       │             pure game/scoring rules
       └─ HttpGameClient → same-origin API (future server)
```

## Responsibilities

- `src/domain/types.ts`: public challenge, player, attempt, active round and result shapes. Public prompts exclude answer groups.
- `src/domain/game.ts`: explicit state transitions, token counts, totals, countdown calculation and spoiler-free summaries.
- `src/domain/scoring.ts`: original normalization, matching and score formulas. Used by the local demo; the HTTP client never computes an official score.
- `src/data/demo-questions.ts`: the original authored fixture with unchanged percentages and aliases.
- `src/data/challenge-bank.ts`: stable prompt-ID lookup, original-fixture compatibility and access to the nonrepeating calendar and a growing verified question inventory. Prepared questions and dates are generated from pinned raw evidence and an editorial mapping. Public prompts include choice labels and reference metadata, but no percentages.
- `src/services/contracts.ts`: replaceable game and repository boundaries.
- `src/services/demo-client.ts`: local orchestration with injectable clock/IDs and idempotent completed-round handling.
- `src/services/storage.ts`: fallible browser storage, persistent guest, runtime save validation and legacy migration. Failure is visible and falls back to memory.
- `src/services/http-client.ts`: API transport, cookie-based session use, response validation, server clock estimate, idempotency headers, retryable errors and local draft merging.
- `src/services/sharing.ts`: native share, clipboard and honest failure reporting.
- `src/ui/`: one renderer per screen, shared escaping/progress/symbol helpers and a controller for events, focus, dialogs, asynchronous operations and timer effects.
- `src/styles/`: retained prototype styling plus mobile/accessibility refinements. Font files are bundled locally.

HTML renderers explicitly escape untrusted text with `safe()`. The `html` tag only permits readable, formatted templates; it does not sanitize values. UI state changes render screens; typing and strategy changes update the current controls without replacing the input or resetting focus.

## State and time

```text
ready → round → reveal → round → ... → reveal (5 results) → complete
```

Help is a modal over the current phase, not a new game phase. The timer continues behind it. Only advancing from a ready/reveal state starts a deadline. A submission after the deadline is a timeout even if a timer callback was throttled. Refresh restores the active draft/deadline or the last reveal. A final reveal stays visible until the player explicitly opens results.

The UI uses a short interval for display, but `deadline - now` determines time. It also checks when the document becomes visible or returns from the browser page cache. Only the low-time warning and results are announced; the full countdown is not a live region. Pending operations block duplicate clicks. A stable round request ID allows server retries without a second score.

## Persistence and daily scope

Version 2 saves are keyed by challenge ID (`swerve_attempt_v2:<challenge-id>`). They store the active round, answer, mode, results and phase. Valid same-day v1 completed rounds migrate with unchanged scores; malformed or stale legacy records are ignored. Replay replaces the demo attempt, preserving guest identity.

Historical dates before 19 October 2026 retain the original demo fixture. From that date, an explicit calendar selects unique reserved question IDs, with no fallback preview that reuses tomorrow's questions. The first expansion contains 310 questions, 62 full days with no unreserved questions, through 19 December 2026. Calendar exhaustion shows a preparation message; it never loops. `reference-surveys-v2-unique-YYYY-MM-DD` IDs isolate the new bank from earlier schedules. Loaded rounds stay pinned across midnight; reload resolves the current UTC day. Only original demo #001 accepts v1 migration.

`content/surveys` stores pinned CSV/question-dictionary and ODS evidence with SHA-256 hashes and source metadata. `content/survey-editorial.json` selects reviewed single-response items and maps their original scales. The offline importer distinguishes raw/count-based fractions from official weighted percentage cells and never infers counts from weighted estimates. It validates cell coordinates, nearest response-header blocks, merged cells, complete distributions and valid bases. It generates the bank, calendar, source ledger, audit and public credits. The raw files stay outside the browser bundle.

`scripts/survey_evidence.py` owns the standard-library evidence readers, original-wording fingerprints, scoring-content digests and append-only reservation algorithm. `content/publication-registry.json` records each reserved question, editorial concept and original wording once. Existing reservations and content digests are validated before new complete days are appended; one to four spare items wait for more sources. Editorial concept assignment still needs human-level semantic review; exact matching cannot detect all paraphrases. `content/source-catalog.json` tracks approved/held/blocked collections and reconciles approved coverage with the bank. The year goal is 1,825 questions and remains unfinished. See [content policy](content/README.md).

Original scoring formulas consume stored source precision; the UI rounds percentages to one decimal. Actual source options are accessible choice buttons, with typed matching retained. API clients validate optional choice/reference metadata. The local repository allows explicitly labelled practice replay; official once-per-day policy and a trusted clock belong to the backend. Public local answer banks and review credits contain future answer spoilers; an authoritative deployment must serve only authorized distributions and publish source attribution without unreleased answer keys.

Storage events reconcile sequential updates between tabs. The demo still has no transactional cross-tab locking, tamper protection, account sync or trustworthy leaderboard. Never promote its stored scores to official results. A server must enforce uniqueness and atomic transitions.

## Testing boundaries

Node tests exercise actual scoring data, game transitions, validation/migration, storage failure and the HTTP request contract with fake clocks and storage. Playwright checks the full browser flow, refresh/expiry, help, sharing, replay, validation, keyboard interaction and small-screen geometry at three viewport sizes. These are Chromium emulations, not physical iOS/Android keyboard or Safari certification.
