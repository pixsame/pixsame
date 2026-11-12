---
title: Playwright 插件
description: 与 Cypress 插件相同的比对引擎和清单，面向 Playwright。
order: 3
reviewed: false
---

# Playwright 插件

Playwright 插件以 `@pixsame/playwright-visual-regression-diff` 的名称发布。它复用 Cypress 插件的比对引擎，写入同一份[清单](/docs/reference/manifest)，并把基线保存在您的仓库里，就在测试旁边。它目前处于 0.x 阶段，因此在 1.0 之前选项仍可能变动。

```bash
npm install --save-dev @pixsame/playwright-visual-regression-diff
```

从该包导入 `test`，并调用 `matchImage` fixture：

```ts
import { test } from '@pixsame/playwright-visual-regression-diff';

test('home page', async ({ page, matchImage }) => {
  await page.goto('/');
  await matchImage();
});
```

各项选项、按浏览器区分的基线以及 Docker 中的远程浏览器，详见[包的 README](https://github.com/pixsame/pixsame/tree/main/packages/playwright-visual-regression-diff#readme)。
