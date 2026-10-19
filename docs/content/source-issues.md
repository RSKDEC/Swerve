# Source issues and decisions

## National Travel Attitudes Study, wave 3: global sample discrepancy

The [official wave 3 publication](https://www.gov.uk/government/statistics/national-travel-attitudes-study-wave-3) describes 2,694 participants. Its linked PDF report says 2,695 in the Sample size section. The archived numeric workbooks provide their own item-specific unweighted response and total bases, commonly 2,694 total and fewer valid responses when a question was skipped.

The cause of this one-person global discrepancy is not established. Swerve uses **the explicit item base and percentage cells from the same published workbook row**, and never combines a percentage from one source with a denominator from the PDF. Weighted percentages remain weighted percentages, with null raw option counts. The importer and regression checks verify the driving-frequency example against the workbook's n=2,694 and its correct frequency header.

The original PDF and numeric workbooks are archived by SHA-256. This decision avoids silently resolving a conflicting source total by guessing and does not imply that all questions have the same valid base.

## Young People Survey: abbreviated labels and a real zero

Some CSV column names are abbreviations rather than faithful question text. `Healthy eating` asks about a healthy lifestyle; `Reading` asks about poetry reading. The original-to-short dictionary and author-supplied translated questionnaire are the wording authorities.

For the socializing-interest item, the author offers the full 1–5 scale but no recorded respondent selected 1. The explicit offered-value mapping retains that choice with count zero and percentage zero. Missing responses remain excluded. This does not authorize inventing unobserved choices for questions whose offered options are undocumented.

## Community Life Survey: missingness outside the published base

The selected tables reconcile their response counts to an item-specific unweighted valid base. They do not supply a full survey-level missing count for each selected item. That unavailable value is represented as null, not zero, and the game uses the declared valid base only. Published weighted headline percentages are not substituted for raw response-count shares.
