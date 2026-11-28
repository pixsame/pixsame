# DiffSpot sample: gemini-4-carbon, judged by sonnet

270 pairs of the DiffSpot test set. Found means the judge called the change "correct" under DiffSpot's judge prompt; right on unchanged pairs means it listed no invented difference.

| What the agent was given | Changes found (95% interval) | Right on unchanged pairs | All pairs | Cost per answer |
| --- | --- | --- | --- | --- |
| Two screenshots | 85% (80%–89%), 200 of 234 | 64% (48%–78%), 23 of 36 | 83% (78%–87%), 223 of 270 | $0.0281 |
| Two screenshots and pixsame's comparison of their pixels | 95% (91%–97%), 222 of 234 | 100% (90%–100%), 36 of 36 | 96% (92%–97%), 258 of 270 | $0.0233 |

Changes found with pixsame's comparison and not from the screenshots alone: 23. The other way round: 1.

## By difficulty

| Difficulty | Two screenshots | Two screenshots and pixsame's comparison of their pixels |
| --- | --- | --- |
| easy | 95% (88%–98%), 74 of 78 | 97% (91%–99%), 76 of 78 |
| medium | 86% (76%–92%), 67 of 78 | 92% (84%–96%), 72 of 78 |
| hard | 76% (65%–84%), 59 of 78 | 95% (88%–98%), 74 of 78 |

## By kind of change

| Kind | Two screenshots | Two screenshots and pixsame's comparison of their pixels |
| --- | --- | --- |
| border | 16 of 18 | 18 of 18 |
| color | 14 of 18 | 18 of 18 |
| font_size | 17 of 18 | 18 of 18 |
| font_weight | 17 of 18 | 18 of 18 |
| gradient | 8 of 18 | 14 of 18 |
| justify | 18 of 18 | 18 of 18 |
| letter_spacing | 16 of 18 | 17 of 18 |
| line_height | 14 of 18 | 14 of 18 |
| opacity | 16 of 18 | 18 of 18 |
| position | 18 of 18 | 18 of 18 |
| rounded | 15 of 18 | 18 of 18 |
| spacing | 14 of 18 | 15 of 18 |
| text | 17 of 18 | 18 of 18 |
