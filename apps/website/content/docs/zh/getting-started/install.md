---
title: 安装
description: 安装 pixsame 的 Cypress 插件，并运行您的第一个视觉回归测试。
order: 1
reviewed: false
---

# 安装

本页讲的是 Cypress 插件，也就是您现在就能安装的那部分。Playwright 插件和 GitHub App 还在开发中。

## 添加依赖包

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

## 接入插件

在您的 support 文件（默认为 `cypress/support/e2e.ts`）中导入命令：

```ts
import '@pixsame/cypress-plugin-visual-regression-diff';
```

然后在 `cypress.config.ts` 中注册插件。如果您同时用到 `e2e` 和 `component`，请在两处都调用 `initPlugin`。一处的注册不会自动带到另一处。

```ts
import { defineConfig } from 'cypress';
import { initPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
  },
});
```

## 生成第一张快照

```ts
cy.get('.an-element-of-your-choice').matchImage();

// 或者对整个页面截图
cy.matchImage();
```

第一次运行没有可比对的对象，所以 `matchImage` 只会把截图存为基线。从那以后，它把每张新截图与这个文件比对。两者差异超过阈值时测试失败，Cypress 运行器里会出现一个 **See comparison** 按钮，点击即可打开差异。

## 正在使用 `@frsource`？

该包从 `@frsource` 搬到了 `@pixsame`。只是改了名字，代码没有任何变化。请参阅[从 @frsource 迁移](/docs/getting-started/migrate-from-frsource)。
