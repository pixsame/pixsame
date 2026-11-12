---
title: Playwright 外掛
description: 與 Cypress 外掛相同的比對引擎與 manifest，提供給 Playwright 使用。
order: 3
reviewed: false
---

# Playwright 外掛

Playwright 外掛已發布為 `@pixsame/playwright-visual-regression-diff`。它沿用 Cypress 外掛的比對引擎，寫出相同的 [manifest](/docs/reference/manifest)，並把基準影像放在你的儲存庫裡，和測試擺在一起。目前版本是 0.x，所以選項在 1.0 之前仍可能變動。

```bash
npm install --save-dev @pixsame/playwright-visual-regression-diff
```

從這個套件匯入 `test`，然後呼叫 `matchImage` fixture：

```ts
import { test } from '@pixsame/playwright-visual-regression-diff';

test('home page', async ({ page, matchImage }) => {
  await page.goto('/');
  await matchImage();
});
```

選項、依瀏覽器區分的基準，以及 Docker 中的遠端瀏覽器，都寫在[套件的 README](https://github.com/pixsame/pixsame/tree/main/packages/playwright-visual-regression-diff#readme) 裡。
