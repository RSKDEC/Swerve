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
