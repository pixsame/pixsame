---
title: 設定
description: pixsame Cypress 外掛的所有選項，可逐次呼叫或全域設定，另附批次審閱模式。
order: 1
reviewed: false
---

# 設定

每個選項都有兩個地方可以放：逐次呼叫時當作 `matchImage` 的引數傳入，或是為整個執行過程設定一次。全域 key 就是逐次呼叫的名稱前面加上 `pluginVisualRegression`，所以 `updateImages` 會變成 `pluginVisualRegressionUpdateImages`。

## 選項

- 逐次呼叫，當作 `matchImage` 的引數。預設值寫在註解裡：

```ts
cy.matchImage({
  // 截圖設定，會直接傳給 Cypress 的 screenshot 方法：https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // 預設：{ }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch 選項，請參閱：https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // 預設：{ includeAA: true }
  diffConfig: {
    threshold: 0.01,
  },
  // 是否自動建立缺少的基準影像
  // 預設：true
  createMissingImages: false,
  // 是否自動更新影像，在 CI 中很實用
  // - true：不比對，直接覆寫所有基準影像（最快）
  // - 'failures-only'：先比對，只有在差異超過門檻時才更新基準影像
  // - false：永遠不自動更新基準影像
  // 預設：false
  updateImages: true,
  // 存放截圖影像的目錄路徑
  // 相對路徑會以專案根目錄為基準解析
  // 支援絕對路徑（unix 與 windows 皆可）
  // 外掛會依作業系統正規化路徑分隔符號，您應一律使用 / 作為分隔符號，例如 windows 磁碟機的寫法：C:/my-directory/nested
  // 路徑中可以使用一個特殊變數：
  // - {spec_path}：從專案根目錄到目前 spec 檔案所在目錄的相對路徑（例如 `/src/components/my-tested-component`）
  // 預設：'{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // 差異超過此門檻時測試即失敗
  // 預設：0.01
  maxDiffThreshold: 0.1,
  // 強制把 scale factor 設為 "1"
  // 可避免在 Mac Retina 這類高解析度螢幕上截圖被放大 2 倍
  // 預設：true
  forceDeviceScaleFactor: false,
  // 用來命名影像檔案的標題
  // 預設：Cypress.currentTest.titlePath（您的測試標題）
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // 傳入自訂影像的路徑作為比對對象，
  // 而不是與上一次執行的影像比對
  // 預設：undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- 整個執行過程，透過 Cypress 的 [expose 設定](https://on.cypress.io/expose)（Cypress 15.10+）。key 與上方相同，只是加上 `pluginVisualRegression` 前綴：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10（15.10 起已棄用，16 中移除）
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

多個選項放在同一個旗標裡，以逗號分隔。別重複傳 `--expose`（或 `--env`）：Cypress 只會留下最後一個，其餘的會一聲不響地丟掉。

```ts
// cypress.config.ts（Cypress 15.10+）
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

```ts
// cypress.config.ts（Cypress <15.10，較新版本已棄用）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

設定 expose 變數的其他方式，Cypress 的文件[寫在這裡](https://on.cypress.io/expose)。

## 清理未使用的影像

測試改名或刪掉之後，它的基準影像會留在原地。帶著這個 key 跑一次，外掛就會刪掉那次執行中沒有任何測試碰過的所有外掛影像。做這件事時請跑完整個測試套件，不然被略過的 spec 的基準也會一起被刪：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10（15.10 起已棄用，16 中移除）
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## 批次審閱模式

平常，快照一超過門檻就會在那個測試裡當場拋出錯誤。批次審閱模式（Batch review mode）改讓測試套件跑到最後，把所有失敗的快照收集起來，再帶著總數拋出一次。在 headed 模式下，執行結束後你會看到一個輪播，逐一檢視失敗的快照，替換或略過每一張基準影像。這是全域選項，所以不能傳給 `matchImage`。用 `pluginVisualRegressionBatchReviewMode` 開啟，想讓通過的影像也出現在輪播裡，再加上 `pluginVisualRegressionBatchReviewModeShowPassingImages`：

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10（15.10 起已棄用，16 中移除）
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

Cypress 外掛頁面的[批次審閱模式一節](/products/cypress-plugin#batch-review-mode)有審閱介面的示範。
