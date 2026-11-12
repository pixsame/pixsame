---
title: 使用方式
description: 設定 matchImage，並讓您的基準影像保持整潔。
order: 2
reviewed: false
---

# 使用方式

這個外掛只加了一個指令：`matchImage`。在測試這一側，API 就這麼多。

## 比對某個元素或整個頁面

```ts
cy.get('.an-element-of-your-choice').matchImage();

// 或是整個頁面
cy.matchImage();
```

## 設定一次比對

選項是每次呼叫時傳進去的。完整清單連同預設值都在[設定](/docs/reference/configuration)頁面。下面這幾個是大家最常先用到的：

```ts
cy.matchImage({
  // 直接轉交給 Cypress 的 screenshot API
  screenshotConfig: { blackout: ['.element-to-be-blackouted'] },
  // pixelmatch 選項
  diffConfig: { threshold: 0.01 },
  // 自動建立尚不存在的基準影像（預設：true）
  createMissingImages: false,
  // 覆寫基準影像：true | 'failures-only' | false（預設：false）
  updateImages: false,
});
```

## 清理未使用的影像

測試被改名或刪掉之後，基準影像會越積越多。這樣跑一次，就會移除所有沒有任何測試碰過的外掛影像：

```bash
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
```

做這件事時請跑完整個測試套件。如果你只篩出幾個 spec 來跑，被略過的那些 spec 的基準也會被當成未使用。

Cypress 版本低於 15.10 的話還沒有 `--expose`，請改用 `--env` 傳入同一個 key。

## 更多資訊

其他所有東西都在[設定](/docs/reference/configuration)頁面。哪裡看不懂，或是有什麼想法，[GitHub discussions](https://github.com/pixsame/pixsame/discussions) 是我們討論這些事的地方。
