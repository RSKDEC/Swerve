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
       │             fixed demo data   validated localStorage
       │                   ↓
       │             pure game/scoring rules
       └─ HttpGameClient → same-origin API (future server)
```

## Responsibilities

- `src/domain/types.ts`: public challenge, player, attempt, active round and result shapes. Public prompts exclude answer groups.
- `src/domain/game.ts`: explicit state transitions, token counts, totals, countdown calculation and spoiler-free summaries.
- `src/domain/scoring.ts`: original normalization, matching and score formulas. Used by the local demo; the HTTP client never computes an official score.
- `src/data/demo-questions.ts`: the original authored fixture with unchanged percentages and aliases.
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

Version 2 saves are keyed by challenge ID (`swerve_attempt_v2:demo-YYYY-MM-DD`). They store the active round, answer, mode, results and phase. Valid same-day v1 completed rounds migrate with unchanged scores; malformed or stale legacy records are ignored. Replay replaces the demo attempt, preserving guest identity.

Demo #001 repeats the same content each UTC day. The date-specific ID isolates attempts; it is not a live challenge feed. A loaded demo attempt can finish across midnight; a reload or new start resolves the current UTC challenge. Real close-time policy belongs to the backend contract.

Storage events reconcile sequential updates between tabs. The demo still has no transactional cross-tab locking, tamper protection, account sync or trustworthy leaderboard. Never promote its stored scores to official results. A server must enforce uniqueness and atomic transitions.

## Testing boundaries

Node tests exercise actual scoring data, game transitions, validation/migration, storage failure and the HTTP request contract with fake clocks and storage. Playwright checks the full browser flow, refresh/expiry, help, sharing, replay, validation, keyboard interaction and small-screen geometry at three viewport sizes. These are Chromium emulations, not physical iOS/Android keyboard or Safari certification.
