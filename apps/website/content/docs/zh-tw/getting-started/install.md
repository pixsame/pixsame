---
title: 安裝
description: 安裝 pixsame 的 Cypress 外掛，並執行您的第一個視覺回歸測試。
order: 1
reviewed: false
---

# 安裝

這一頁講的是 Cypress 外掛，也就是你現在就能安裝的那部分。Playwright 外掛與 GitHub App 還在開發中。

## 加入套件

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

## 完成設定

在你的 support 檔案（預設為 `cypress/support/e2e.ts`）中匯入指令：

```ts
import '@pixsame/cypress-plugin-visual-regression-diff';
```

接著在 `cypress.config.ts` 中註冊外掛。如果你同時用到 `e2e` 和 `component`，兩邊都要各呼叫一次 `initPlugin`，它不會從一邊帶到另一邊。

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

## 拍下你的第一張快照

```ts
cy.get('.an-element-of-your-choice').matchImage();

// 或是整個頁面
cy.matchImage();
```

第一次執行時沒有東西可以比對，所以 `matchImage` 只會把截圖存下來當基準。之後每一次它都拿新截圖和那個檔案比。差異超過門檻時測試就失敗，Cypress runner 裡會出現一顆 **See comparison** 按鈕，點下去就是差異畫面。

## 從 `@frsource` 過來的嗎？

套件從 `@frsource` 搬到了 `@pixsame`。就只是改名，程式碼什麼都沒變。請參閱[從 @frsource 遷移](/docs/getting-started/migrate-from-frsource)。
