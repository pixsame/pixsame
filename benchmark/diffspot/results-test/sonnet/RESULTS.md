# DiffSpot sample: sonnet, judged by sonnet

270 pairs of the DiffSpot test set. Found means the judge called the change "correct" under DiffSpot's judge prompt; right on unchanged pairs means it listed no invented difference.

| What the agent was given | Changes found (95% interval) | Right on unchanged pairs | All pairs | Cost per answer |
| --- | --- | --- | --- | --- |
| Two screenshots | 88% (83%–92%), 206 of 234 | 100% (90%–100%), 36 of 36 | 90% (85%–93%), 242 of 270 | $0.0183 |
| Two screenshots and pixsame's comparison of their pixels | 94% (90%–96%), 219 of 234 | 100% (90%–100%), 36 of 36 | 94% (91%–97%), 255 of 270 | $0.0212 |

Changes found with pixsame's comparison and not from the screenshots alone: 15. The other way round: 2.

## By difficulty

| Difficulty | Two screenshots | Two screenshots and pixsame's comparison of their pixels |
| --- | --- | --- |
| easy | 92% (84%–96%), 72 of 78 | 96% (89%–99%), 75 of 78 |
| medium | 86% (76%–92%), 67 of 78 | 92% (84%–96%), 72 of 78 |
| hard | 86% (76%–92%), 67 of 78 | 92% (84%–96%), 72 of 78 |

## By kind of change

| Kind | Two screenshots | Two screenshots and pixsame's comparison of their pixels |
| --- | --- | --- |
| border | 15 of 18 | 17 of 18 |
| color | 14 of 18 | 17 of 18 |
| font_size | 18 of 18 | 18 of 18 |
| font_weight | 18 of 18 | 17 of 18 |
| gradient | 14 of 18 | 13 of 18 |
| justify | 18 of 18 | 18 of 18 |
| letter_spacing | 17 of 18 | 18 of 18 |
| line_height | 15 of 18 | 16 of 18 |
| opacity | 16 of 18 | 18 of 18 |
| position | 18 of 18 | 18 of 18 |
| rounded | 11 of 18 | 17 of 18 |
| spacing | 15 of 18 | 15 of 18 |
| text | 17 of 18 | 17 of 18 |
