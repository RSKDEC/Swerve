# Backend contract — implementation target

`GameClient` is the UI boundary. `DemoClient` is fully implemented locally. `HttpGameClient` is implemented and tested against mocked responses; **no live backend or account provider is included**. Enable the transport only after implementing the endpoints below by setting `VITE_SWERVE_API_BASE=/api` at build time. The app never silently falls back to demo scores if the API fails.

## Responses and identity

All successful responses include `serverNow`, a finite Unix timestamp in milliseconds, alongside the data below. The browser estimates display time from that timestamp; the server's clock alone determines scoring eligibility.

`GET /api/game/today` returns `{ serverNow, challenge, player, attempt }`, matching `GameContext` in `src/domain/types.ts`. `attempt` may be null. Public challenge data contains ID, display number, UTC day, opens/closes timestamps, duration, five prompt IDs/text/hints, optional `choices` labels and `source` metadata (ID/title/year/valid-answer n/HTTPS source URL), `kind: "daily"` and a scoring version. It contains **no aliases, answer keys or unrevealed distributions**. Results include only distributions that may be revealed to that player.

The server establishes an anonymous guest session using a Secure, HttpOnly, SameSite cookie. Optional account login upgrades or links this identity; it must not grant another daily attempt. `Player` already distinguishes `guest` and `account`. Local demo guest IDs are browser conveniences, not authenticated accounts. Do not trust a player ID supplied by a browser.

| Endpoint                    | Request body                   | Result                                                                                      |
| --------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| `GET /game/today`           | None                           | Context with current challenge and resumable attempt.                                       |
| `POST /attempts`            | `{ challengeId }`              | `{ serverNow, attempt }`; existing attempt or new `ready` attempt.                          |
| `POST /attempts/:id/next`   | `{ completedRounds }`          | Atomically starts the next round with a server deadline, or marks final results `complete`. |
| `POST /attempts/:id/rounds` | `{ roundIndex, mode, answer }` | Atomically settles one round and returns the updated attempt.                               |

All POST requests send an `Idempotency-Key`. Start uses `start:<challengeId>`; advance uses `<attemptId>:next:<completedRounds>`; submit uses `<attemptId>:round:<roundIndex>`. Scope keys to the authenticated session/account and operation. Store committed responses so retries after a lost response return the original result. Reject reused keys with different committed payloads, except that a server-owned round result can always be recovered via GET. Do not charge another token on a retry.

Accept only the documented fields. Validate mode membership, maximum 70 characters, active round index, ownership, phase, remaining tokens, and server deadline inside the scoring transaction. Client requests never contain a score, percentage, player ID or deadline. A late request settles the round as timeout; null mode on timeout consumes the first available strategy. Early blank submissions and missing strategies remain validation errors. The server must also settle expired rounds on resume, even if a browser never sends its timeout request.

Return 401 for expired/invalid sessions, 409 for incompatible state, 410 for a closed challenge, and 5xx for temporary failures. The UI retains the attempt and offers resubmission or reload without inventing a score. A timed-out round can be retried even without a selected strategy. GET/POST responses should be `Cache-Control: no-store`. Enforce same-origin requests and CSRF protections on the server; the supplied client uses same-origin cookies and JSON.

## Proposed durable model

| Entity                      | Key constraints / responsibility                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| players, accounts, sessions | Server identities, optional account linkage, session expiry; preserve guest attempt ownership during account upgrade.      |
| challenges                  | Unique UTC day, immutable published version, opening/closing times, scoring version, five ordered prompts.                 |
| prompt_groups, aliases      | Private, versioned answer taxonomy, moderation status, canonical group IDs.                                                |
| reference_distributions     | Immutable crowd reference per published prompt/version; collection provenance and minimum sample criteria.                 |
| attempts                    | Unique `(player_id, challenge_id)`; authoritative phase and current round deadline; transactional row lock or equivalent.  |
| submissions                 | Unique `(attempt_id, round_index)`; raw/normalized answer, strategy, receipt time, matched group, scoring version, result. |
| idempotency_records         | Unique `(principal, operation, key)` with request digest and committed response.                                           |

Freeze distributions before opening the challenge if immediate reveals are retained. Scoring against the same day's changing population would make results unstable and reveal information to later players. The original demo formulas are retained for compatibility, not yet calibrated for competition. Establish sampling, moderation, unknown-answer policy, calibration and versioning before ranking real players.

## Daily and account behavior to implement

1. Publish editorially reviewed challenges against immutable reference distributions, with a server UTC schedule. Define late-start and day-close policy explicitly; reject or settle expired attempts transactionally.
2. Add authenticated anonymous sessions and database-backed attempts, deadlines, token accounting and idempotency. Never use browser storage or a client clock as an anti-cheat boundary.
3. Integrate an account provider and verified guest-to-account linking. Keep once-per-day constraints across login, devices and session renewal.
4. Add richer answer validation and moderation before public scoring. The demo's unknown-answer zero is deliberately limited.
5. Add rate limiting, abuse handling, observability, retention/deletion rules and integration tests before public launch. Leaderboards and friend leagues can then read authoritative results.

Practice replay is available in the local client; the authoritative HTTP client still enforces once-per-day play. Do not advertise `practiceAllowed` from the server without implementing a separate noncompetitive practice flow. Draft typing is saved locally; the server receives the final answer at submission. Browser-local drafts are merged on reload only for the same attempt, round and server deadline. Production should define what happens to unsent drafts when a device is lost; they are not guaranteed to sync between devices.

## Source evidence for reference scoring

The current source-backed bank is documented in [content policy](content/README.md). Import immutable source counts and bases, original wording, field-date/publication-year limits, licence, adaptations and source hashes alongside each distribution. Keep `(source_id, source_commit, column/item, content_version)` provenance. Preserve missing-answer exclusions and unweighted frequency semantics; never replace them with an inferred public-population estimate. Public choice labels may be visible before submission; their counts, percentages and aliases must stay server-side until authorized reveal. Return dated reference metadata and keep attribution accessible.

Use the same `100 × count / validAnswers` fraction and original score rounding as the local client. Do not score against the display-rounded percentage. Published evidence or scoring changes require a new immutable content/challenge version so saved results cannot be reinterpreted.

## Global question-use registry

The one-year content target is 1,825 unique questions. Mirror `content/publication-registry.json` with a server-side reservation table that has global unique constraints on stable question ID, reviewed concept key and original-wording fingerprint. A new wave/year, demographic cut, paraphrase or content version must not reserve the same underlying question again. Preserve existing published/reserved scoring digests and append new complete days only; never wrap an exhausted pool. Practice attempts reuse the same challenge explicitly and do not publish new inventory. Human editorial review remains necessary for semantic duplicates that exact fingerprints cannot detect.
