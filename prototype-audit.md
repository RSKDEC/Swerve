# Prototype audit — milestone 1

All three files in the supplied `swerve-prototype.zip` were inspected before editing.

| File                        | Finding                                                                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html` (24,415 bytes) | The working application: embedded CSS, data, state, timer, matching, scoring, templates, persistence and event handlers. This is the behavioral source of truth.                                                            |
| `check.js` (15,486 bytes)   | An older duplicate of the embedded script, not tests. It contains an invalid quoted `today's` string, differs in input disabling, and omits the updated help/timer restoration behavior. Removed from the maintained app.   |
| `README.md` (1,810 bytes)   | Describes the demo mechanics and explicitly acknowledges authored distributions, unknown-answer limitations, fixed challenge number and missing backend. Replaced with runnable development and architecture documentation. |

## Behavior preserved

- Five prompts, in their original order, with the original 25 answer groups, aliases and authored percentages.
- Each round lasts 30 seconds, starting when the question appears. Reading a reveal does not consume the next round's time.
- Two Blend tokens, two Swerve tokens, one Sweet Spot token. Pick a strategy before entering an answer; strategy may change until submission.
- Normalization lowercases, removes diacritics, replaces punctuation with spaces, removes the original stop-word list, and collapses whitespace. Matching is exact after normalization, not fuzzy or semantic.
- Blend: `clamp(round(p / 48 * 100), 0, 100)`.
- Swerve: `clamp(round((1 - p / 50) * 100), 0, 100)`.
- Sweet Spot: `max(0, round(100 - abs(p - 17) * 5))`.
- Unmatched answers score zero. They do not receive a rare-answer bonus and are not actually submitted to a review service.
- Timeout scores zero even if an answer was typed. With no chosen strategy it consumes the first available token in Blend → Swerve → Sweet Spot order.
- Every round reveals its answer/matched group, score, distribution and running total. The fifth reveal leads to results out of 500, strategy pills, round breakdown, sharing, copy and confirmed demo replay.
- Score labels retain the original thresholds: round reactions at 85/60/35, result labels at 400/300/200, share squares at 80/50.
- Help, UTC-based progress and the original dark/lime identity remain.

## Defects addressed

The old timer used wall-clock time during a loaded round, but active state was not persisted. Refresh granted a new 30 seconds and discarded the draft. Only completed rounds were saved; refresh skipped the last reveal. The submit handler trusted the most recent interval tick rather than checking the deadline itself. Help restored elapsed time only on closing. Saved JSON was checked only for its day and a results array. Clipboard fallback always reported success, regardless of whether copying worked. The entire app was an `aria-live` region, including frequent timer updates.

The refactor persists active deadline, mode, draft and phase; evaluates expiry on submit/load/visibility; keeps the timer active behind help; validates and migrates saves; reports copy failures honestly; and uses targeted announcements. Demo #001 and the scoring calibration remain intentionally unchanged.
