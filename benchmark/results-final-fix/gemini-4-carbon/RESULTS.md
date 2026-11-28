# Results: gemini-4-carbon

290 changed pages and 30 unchanged pages per arm, one answer each. Judge: sonnet. Intervals are 95%.

| What the agent was given | Changes found | Invented a difference on an unchanged page | Input tokens | Output tokens | Cost per answer | Time |
| --- | --- | --- | --- | --- | --- | --- |
| Two screenshots | 92% (88–94) | 3% (1 of 30) | 2,322 | 1,317 | $0.0178 | 25.8 s |
| Two accessibility snapshots | 7% (5–10) | 0% (0 of 30) | 751 | 487 | $0.0064 | 10.1 s |
| `pixsame snap` output | 100% (99–100) | 0% (0 of 30) | 290 | 257 | $0.0032 | 8.5 s |

The model was asked through the Gemini API with every file of the case attached, not as an agent that reads them, so there is no agent overhead in these tokens and they do not compare with a Claude Code run. Output tokens include thinking. Cost is counted from the tokens at list prices.

## Changes found, by kind of change

| Kind | Two screenshots | Two accessibility snapshots | `pixsame snap` output |
| --- | --- | --- | --- |
| background-color | 10 of 10 | 0 of 10 | 10 of 10 |
| background-image | 10 of 10 | 0 of 10 | 10 of 10 |
| border-color | 10 of 10 | 0 of 10 | 10 of 10 |
| border-radius | 10 of 10 | 0 of 10 | 10 of 10 |
| border-width | 10 of 10 | 0 of 10 | 10 of 10 |
| box-shadow | 10 of 10 | 0 of 10 | 10 of 10 |
| color | 10 of 10 | 0 of 10 | 10 of 10 |
| display-none | 10 of 10 | 10 of 10 | 10 of 10 |
| filter | 10 of 10 | 0 of 10 | 10 of 10 |
| font-family | 9 of 10 | 0 of 10 | 10 of 10 |
| font-size | 7 of 10 | 0 of 10 | 10 of 10 |
| font-style | 10 of 10 | 0 of 10 | 10 of 10 |
| font-weight | 10 of 10 | 0 of 10 | 10 of 10 |
| gap | 9 of 10 | 0 of 10 | 10 of 10 |
| height | 10 of 10 | 0 of 10 | 10 of 10 |
| hidden | 10 of 10 | 10 of 10 | 10 of 10 |
| letter-spacing | 5 of 10 | 0 of 10 | 10 of 10 |
| line-height | 1 of 10 | 0 of 10 | 10 of 10 |
| margin | 7 of 10 | 0 of 10 | 10 of 10 |
| move | 10 of 10 | 0 of 10 | 10 of 10 |
| opacity | 9 of 10 | 0 of 10 | 10 of 10 |
| order | 10 of 10 | 0 of 10 | 10 of 10 |
| outline | 10 of 10 | 0 of 10 | 10 of 10 |
| padding | 10 of 10 | 0 of 10 | 10 of 10 |
| text-align | 10 of 10 | 0 of 10 | 10 of 10 |
| text-decoration | 10 of 10 | 0 of 10 | 10 of 10 |
| text-transform | 10 of 10 | 0 of 10 | 10 of 10 |
| transform | 9 of 10 | 0 of 10 | 10 of 10 |
| width | 10 of 10 | 0 of 10 | 10 of 10 |
