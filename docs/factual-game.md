# Swerve factual pilot

## Product change

The active game is now original factual categories with free typing. We retired survey-style preference/personality questions from current play. Existing historical data, regression fixtures and saves are preserved. This is an independent design inspired by the appeal of finding an unexpected correct answer; it does not copy Krillion's prompt bank, scoring algorithm or answer sets.

There are **15 prompts, 174 accepted answers and 3 unique daily sets** for 19–21 October 2026. This is a focused pilot, not a year of content. No daily question is reused. Exhaustion shows the existing preparation message. Explicit practice replay remains available on completed current challenges. The year target remains 1,825 original, reviewed factual prompts; archived surveys do not count toward it.

## Score design, attention-v1

Five rounds, 30 seconds each, 2 Blend / 2 Swerve / 1 Sweet Spot, maximum 500. No speed bonus, jackpot or live AI judging. The timer continues in help and across refresh. A late submission scores zero even if the client timer display has not ticked.

Every **listed correct** answer earns 20 base points plus up to 80 strategy points. Blank, timed-out or unlisted answers earn zero. An unlisted answer may reflect an editorial omission, not necessarily a factual mistake; the UI says so. There is no review queue in this pilot.

We measure English Wikipedia article views (all access, user agent class) over **1 July–30 September 2026, 92 days**. Each answer maps to a resolved, non-disambiguation article. Total requests are recorded, not fabricated percentages or unique people. Broad/ambiguous concepts are excluded where the article would measure an unrelated topic; the NATO spelling alphabet was excluded for that reason.

For N answers, let L be the number with fewer views and T the number tied at this answer's view count. The attention index is:

`f = 100 × (L + (T − 1) / 2) / (N − 1)`

This is a relative percentile-like rank within the accepted answer set, not a population share. Tied counts share the average rank. The full index is used in scoring; only display text is rounded. Indices do not sum to 100. Ranking makes strategies usable across categories with very different audience sizes, though it deliberately ignores the size of the view-count gaps.

| Strategy   | Points before final rounding       | Intent            |
| ---------- | ---------------------------------- | ----------------- |
| Blend      | `20 + 0.8 × f`                     | High attention    |
| Swerve     | `100 − 0.8 × f`                    | Low attention     |
| Sweet Spot | `100 − 2 × max(40 − f, f − 60, 0)` | Middle 40–60 band |

Valid scores are integers from 20 to 100. The generator rejects any question without a 100-point answer for every strategy. This prevents a scarce category from having an impossible Sweet Spot target. No answer gets a secret premium. Every player sees the same frozen scoring map for that challenge version.

## Why it should feel better

- Prompts ask for one answer from an interesting factual category, not agreement with a survey statement.
- There is room to remember something rather than choose a visible option.
- Correct answers always earn credit; strategy changes how much.
- Sweet Spot has a forgiving band instead of an arbitrary population percentage.
- The reveal explains the base/strategy breakdown and shows useful discoveries, with all answers available after the round.
- Answer matching accepts explicitly reviewed aliases, case, punctuation, diacritics and apostrophe variants. Single-letter chemical symbols stay meaningful. It does not guess typos, which avoids converting a wrong answer into a different valid answer.

## Evidence and editorial limits

The catalog contains original prompt wording and scopes. A pinned Wikipedia revision supports each category's membership; Wikipedia contributors and source licences are linked in `factual-credits.html`. View evidence contains every daily observation, its API endpoint, canonical article mapping, sums, window and SHA-256. Wikimedia aggregate views are CC0; Wikipedia source text is CC BY-SA. No copied source paragraphs are needed for prompts.

Factual membership is editorially reviewed and tested for structural integrity, not automatically proven by the view-count API. Titles, historical cutoffs, list completeness and acceptable aliases still need human review as the bank grows. A new demographic, paraphrase or changed year is not automatically a new question. Do not inflate the inventory by splitting one category into trivial variations.

Attention is a **familiarity proxy**. News spikes, article renames/redirects, English-language audience, page scope, and automated traffic misclassification can affect it. We use canonical article histories only, not a claim that every redirect or translated article is aggregated. A film or game release can make a surprising answer highly viewed. Players should judge whether that feels satisfying in a playtest; the score is mechanically reproducible, not a validated model of human recall.

The snapshot is frozen, not a live metric. Evidence corrections require an explicitly retired pilot version/new challenge namespace, never reinterpretation of old saved scores. The publication registry appends new complete days and rejects changed reserved content. This small pilot does not include trusted accounts, cross-device official attempts, a leaderboard or a production backend. Local source and credit files reveal answer keys; the HTTP architecture is ready for a server to withhold future keys.

## Validation and next decision

`npm run check` validates both the historical survey archive and the new factual evidence, types, scoring properties, matching, save/API boundaries, full-day completions and build. Browser tests cover original regression play and the new factual flow on desktop, 390px mobile and 320px mobile. Emulator checks do not establish physical keyboard or Safari behavior.

Before scaling to a year, playtest this small set for prompt enjoyment, surprise, score fairness and return intention. No retention or player-satisfaction results are claimed yet. Future expansion should prioritize more engaging categories and independently verified answer sets rather than the largest available dataset.
