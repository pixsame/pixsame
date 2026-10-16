---
reviewed: false
source: 2c9b39af16bde9aa
---

## 快速開始

### 安裝

您可以使用慣用的套件管理工具安裝這個函式庫：

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

接著，您需要匯入這個函式庫：

- 首先，在 support 檔案中（預設位於 `cypress/support/index.js`）：

```ts
// typescript / ES6
import '@pixsame/cypress-plugin-visual-regression-diff';

// javascript
require('@pixsame/cypress-plugin-visual-regression-diff');
```

- 接著，在 `cypress.config.js`（或 `cypress.config.ts`）中：

```ts
// typescript / ES6
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  // initPlugin 必須在實際使用它的區段中呼叫：e2e 或 component
  e2e: {
    setupNodeEvents(on, config) {
      initVisualRegressionPlugin(on, config);
    },
  },
  component: {
    setupNodeEvents(on, config) {
      initVisualRegressionPlugin(on, config);
    },
  },
});
```

這樣就完成了，接下來請到[使用方式](#usage)章節看看如何使用這個函式庫。

## 使用方式

安裝完成後，只要在測試中這樣寫就能使用：

```ts
cy.get('.an-element-of-your-choice').matchImage();
```

或者，若您想擷取整份文件的截圖：

```ts
cy.matchImage();
```

`matchImage` 指令會擷取一張截圖，並與上一次執行時的影像進行比對。一旦發生視覺回歸，測試就會失敗，並且會出現「See comparison」按鈕，讓您查看問題的根源。

## 範例

安裝上還是遇到問題嗎？請參考[這個 repo 的 examples 目錄](https://github.com/pixsame/pixsame/tree/main/examples)，看看如何在您專案的 Cypress e2e 或元件測試環境中使用這個外掛。

## 自動清理未使用的影像

把視覺回歸外掛產生、但已經沒有任何測試在使用的截圖清掉，是很實用的功能。
透過 expose 變數啟用這項功能，即可釋放儲存空間 🚀：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10（15.10 起棄用，16 已移除）
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## 設定

您可以透過以下方式設定這個外掛：

- 將設定以參數的形式傳給 `matchImage` 指令：

```ts
cy.matchImage({
  // 截圖設定，會直接傳給 Cypress 的 screenshot 方法：https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // 預設值：{ }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch 選項，請參考：https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // 預設值：{ includeAA: true }（2.0 改用 pixelmatch 本身的預設值 includeAA: false，請見下方「降低跨作業系統的算繪雜訊」）
  diffConfig: {
    threshold: 0.01,
  },
  // 是否自動建立缺少的基準影像
  // 預設值：true
  createMissingImages: false,
  // 是否自動更新影像，在 CI 上很實用
  // - true：不比對，直接覆寫所有基準影像（最快）
  // - 'failures-only'：先比對，只在差異超過門檻值時才更新基準影像
  // - false：永遠不自動更新基準影像
  // 預設值：false
  updateImages: true,
  // 儲存截圖影像的目錄路徑
  // 相對路徑會以專案根目錄為基準解析
  // 支援絕對路徑（unix 與 windows 作業系統皆可）
  // 外掛會依作業系統正規化路徑分隔符號，您應一律使用 / 作為分隔符號，例如：C:/my-directory/nested 表示 windows 風格的磁碟機路徑
  // 路徑中可使用一個特殊變數：
  // - {spec_path}：從專案根目錄到目前 spec 檔案所在目錄的相對路徑（例如 `/src/components/my-tested-component`）
  // 預設值：'{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // 測試失敗的最大門檻值，差異超過此值即失敗
  // 預設值：0.01
  maxDiffThreshold: 0.1,
  // 強制將縮放比例設為 "1"
  // 可解決在 Mac Retina 等高解析度螢幕上截圖被放大 2 倍的問題
  // 適用於 Chrome 與 Chromium（2.0 擴及 Edge 與 Firefox，這會讓它們在高解析度螢幕上的基準影像更新一次）
  // 預設值：true
  forceDeviceScaleFactor: false,
  // 套用確定性算繪預設組合，請見下方「降低跨作業系統的算繪雜訊」
  // 在單次呼叫中，它只控制為截圖注入頁面的 CSS（游標、動畫、捲軸）；
  // 瀏覽器的啟動參數是整個程序共用的，由全域的 pluginVisualRegressionDeterministicRendering 選項決定
  // 預設值：false（2.0 起預設開啟）
  deterministicRendering: true,
  // 用來命名影像檔案的標題
  // 預設值：Cypress.currentTest.titlePath（您的測試標題）
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // 傳入自訂影像的路徑作為比對對象
  // 而不是與上一次執行的影像比對
  // 預設值：undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- 透過[全域 expose 設定](https://on.cypress.io/expose)（Cypress 15.10+）。設定鍵的名稱與上方設定物件的鍵相同，只是多了 `pluginVisualRegression` 前綴，例如：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10（15.10 起棄用，16 已移除）
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

請在同一個旗標中以逗號分隔傳入多個選項。若重複使用 `--expose`（或 `--env`），Cypress 只會保留最後一個。

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

```ts
// cypress.config.ts（Cypress <15.10，新版已棄用）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

更多設定 expose 變數的方式[請參考這裡](https://on.cypress.io/expose)。

## 批次審閱模式

批次審閱模式（Batch Review Mode）讓您可以跑完整個測試套件，而不會在第一個視覺差異失敗時就停下來。所有失敗的快照會被收集起來，在測試結束後呈現在互動式的審閱介面中，讓您可以批次核准或略過變更。

### 有頭模式（非 CI 環境）下的額外功能

啟用後，Cypress 測試執行器的右下角會出現一個浮動操作按鈕（FAB）。測試執行期間：

- 每當 `matchImage()` 呼叫的差異超過門檻值時，FAB 上的計數徽章會加一，而不是立即拋出錯誤。
- 所有測試跑完後，會拋出一個錯誤，列出失敗的總數。
- 點擊 FAB 會開啟一個輪播介面，讓您逐一並排檢視每張失敗的快照（新 vs. 舊），並選擇**取代**基準影像或**略過**這項變更。

![批次審閱模式示範](https://raw.githubusercontent.com/pixsame/pixsame/main/assets/batch-review-mode.gif)

> 注意：批次模式將在下一個主要版本成為預設行為。若要保留舊的行為，請務必將設定屬性設為 `false`（詳見下方說明）。

### 如何啟用

批次審閱模式是全域選項（無法直接傳給 `matchImage`）。請使用 `pluginVisualRegressionBatchReviewMode` 鍵來啟用：

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10（15.10 起棄用，16 已移除）
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

```ts
// cypress.config.ts（Cypress <15.10，新版已棄用）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

### 審閱通過的影像

與基準影像有差異、但仍在 `maxDiffThreshold` 範圍內的影像不會讓測試失敗，但同樣會被收集起來。輪播介面中有一個 **Show passing** 核取方塊，勾選後即可瀏覽這些影像（每張都會標示 `passed` 徽章），並同樣可以取代它們的基準影像，例如用來消除逐漸累積的細微偏移。

這個核取方塊預設為未勾選。若想讓它預設勾選，請使用 `pluginVisualRegressionBatchReviewModeShowPassingImages` 鍵：

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true" --expose "pluginVisualRegressionBatchReviewModeShowPassingImages=true"
# Cypress <15.10（15.10 起棄用，16 已移除）
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true,pluginVisualRegressionBatchReviewModeShowPassingImages=true"
```

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
    pluginVisualRegressionBatchReviewModeShowPassingImages: true,
  },
});
```

在執行器中切換這個核取方塊的狀態會記錄在瀏覽器的 local storage 中，之後的執行會以它為準，優先於設定檔中的值。

## 降低跨作業系統的算繪雜訊

瀏覽器會把文字的點陣化交給作業系統處理（macOS 用 CoreText、Windows 用 DirectWrite、Linux 用 FreeType），因此同一個頁面在開發者的筆電與 Linux CI 執行器上，永遠不會算繪出逐位元組完全相同的結果。外掛無法完全消除這個問題，但 `deterministicRendering` 預設組合可以去除發生在瀏覽器內部的那一部分雜訊。

這個預設組合在 1.x 為選用功能，預設關閉。2.0 起預設開啟，所以現在就啟用，等於提前取得 2.0 的行為，不需要其他任何變更。

### 如何啟用

瀏覽器的啟動參數是整個程序共用的，因此這個預設組合是全域選項。請用 `pluginVisualRegressionDeterministicRendering` 這個鍵來啟用：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true"
# Cypress <15.10（15.10 起棄用，16 已移除）
npx cypress run --env "pluginVisualRegressionDeterministicRendering=true"
```

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionDeterministicRendering: true,
  },
});
```

```ts
// cypress.config.ts（Cypress <15.10，新版已棄用）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionDeterministicRendering: true,
  },
});
```

第一次執行時，與未使用預設組合所建立的基準影像相比，預期會有些微差異，因為文字是在不使用 hinting 的情況下點陣化的。請執行一次 `pluginVisualRegressionUpdateImages=true`（或 `'failures-only'`），或在批次審閱模式中核准這些變更，然後 commit 結果。

### 它做了什麼

- **Chrome、Chromium、Edge** 會以 `--font-render-hinting=none --disable-font-subpixel-positioning --disable-lcd-text --force-color-profile=srgb --disable-gpu` 啟動（文字不使用作業系統的 hinting 與次像素技巧、不做色彩管理、以 CPU 點陣化），無頭模式下另外加上 `--hide-scrollbars`。這份清單以 `DETERMINISTIC_RENDERING_CHROMIUM_ARGS` 的名稱從 `@frsource/cypress-plugin-visual-regression-diff/constants` 匯出。
- **Firefox** 會設定 `gfx.webrender.software` 偏好設定（CPU 算繪）。Firefox 沒有跨平台的字型 hinting 開關，因此文字在不同作業系統之間仍可能有差異。
- **所有瀏覽器**：在 `matchImage` 截圖期間，會在受測頁面注入一個 `<style>` 元素，用來隱藏文字游標、停用 CSS transition、動畫與平滑捲動，並隱藏捲軸。截圖一結束就會移除。

這個預設組合無法解決的問題：各作業系統使用不同的字型檔與備用字型（經典的 Arial 對 Liberation Sans 情況）、emoji 字型、WebKit 與 Firefox 的文字點陣化，以及 WebGL 繪製的影像。對於這些情況，請為每個平台各保留一份基準影像（請參考 `title` 與 `imagesPath` 選項，以及常見問題中關於瀏覽器名稱的條目），或是在與 CI 相同的環境中產生基準影像。

**Electron** 會忽略外掛設定的啟動參數，所以在 Electron 上，這個預設組合只會注入 CSS，並在瀏覽器啟動時印出提醒。請改用環境變數傳入這些參數：

```bash
ELECTRON_EXTRA_LAUNCH_ARGS="--font-render-hinting=none --disable-font-subpixel-positioning --disable-lcd-text --force-color-profile=srgb --disable-gpu --hide-scrollbars" npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true"
```

**WebGL**：`--disable-gpu` 可能讓依賴 WebGL 的頁面無法取得算繪環境。您可以不啟用預設組合，或是在自己的 `before:browser:launch` 處理常式中加入 `--use-gl=angle --use-angle=swiftshader`（較新的 Chrome 還需要 `--enable-unsafe-swiftshader`），並透過 [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix) 與外掛本身的處理常式組合使用。

**截圖 hook**：外掛會為它拍攝的每一張截圖傳入自己的 `onBeforeScreenshot` 與 `onAfterScreenshot`。透過 `screenshotConfig` 傳入的 hook 仍會被呼叫；以 `Cypress.Screenshot.defaults()` 全域設定的 hook 則不會。

### 抗鋸齒像素：搭配 `includeAA: false`

1.x 的比對仍以 `includeAA: true` 執行 `pixelmatch`，因此每個算繪結果略有不同的抗鋸齒邊緣像素，都會計入差異比例。這是跨作業系統雜訊的另一半，而預設組合並不處理它。請搭配 `includeAA: false`（pixelmatch 本身的預設值，會偵測並略過抗鋸齒像素）使用，2.0 會把它設為預設值：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true,pluginVisualRegressionDiffConfig={\"includeAA\":false}"
# Cypress <15.10（15.10 起棄用，16 已移除）
npx cypress run --env "pluginVisualRegressionDeterministicRendering=true,pluginVisualRegressionDiffConfig={\"includeAA\":false}"
```

```ts
cy.matchImage({ diffConfig: { includeAA: false } });
```

啟用後差異比例會變小，所以有些先前失敗的比對會通過。基準影像不受影響。

### 單次呼叫

`matchImage` 的 `deterministicRendering` 選項只控制注入的 CSS；瀏覽器的啟動參數仍由全域選項決定。若要在單張截圖中略過這段 CSS（例如您想擷取動畫結束時的狀態）：

```ts
cy.matchImage({ deterministicRendering: false });
```

或者，不在全域啟用預設組合，只為單張截圖注入 CSS：

```ts
cy.matchImage({ deterministicRendering: true });
```

## 常見問題

### 為什麼截圖不符合我在 Cypress 設定中指定的 `viewport`？

Cypress 的截圖預設不會依 viewport 大小縮放。您可以這樣調整：

- 全域：修改預設的截圖設定：`Cypress.Screenshot.defaults({ capture: 'viewport' });`
- 區域：直接把截圖設定傳給 `.matchImage` 指令：`cy.matchImage({ screenshotConfig: { capture: 'viewport' } });`

### 我升級了這個外掛的版本，結果所有基準影像都被自動更新了。為什麼？

有時候我們必須對影像比對或影像產生的演算法做出破壞性變更。為了讓您的升級過程盡可能輕鬆，外掛會自動更新您的基準影像。升級外掛後，只要把這些影像 commit 進您的 repository 就可以了！

### `cypress run` 和 `cypress open` 的截圖看起來不一樣，該怎麼解決？

這通常是無頭模式與有頭模式之間 device pixel ratio 不同所造成的。請使用 `forceDeviceScaleFactor` 選項將縮放比例統一為 `1`：

```ts
cy.matchImage({ forceDeviceScaleFactor: true });
```

或透過 expose 變數全域設定：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionForceDeviceScaleFactor=true"
# Cypress <15.10（15.10 起棄用，16 已移除）
npx cypress run --env "pluginVisualRegressionForceDeviceScaleFactor=true"
```

若 viewport 大小的差異持續存在，可以考慮在 `setupNodeEvents` 中明確指定瀏覽器視窗大小（請透過 [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix) 與外掛本身的 `before:browser:launch` 處理常式組合使用）：

```ts
on('before:browser:launch', (browser, launchOptions) => {
  if (browser.family === 'chromium' && browser.isHeadless) {
    launchOptions.args.push('--window-size=1280,720');
  }
  return launchOptions;
});
```

若兩次執行是在不同的作業系統上（macOS 筆電對 Linux CI 執行器），剩下的差異來自字型算繪。請參考[降低跨作業系統的算繪雜訊](#reducing-cross-os-rendering-noise)。

### 如何讓這個外掛與其他同樣在 `setupNodeEvents` 註冊事件的 Cypress 外掛並用？

Cypress 每個事件只支援一個處理函式。如果多個外掛註冊了同一個事件（例如 `after:screenshot`），只有最後一個會被呼叫。若要安全地組合多個外掛，請使用 [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix)：

```ts
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';
import fix from 'cypress-on-fix';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const fixedOn = fix(on);
      initVisualRegressionPlugin(fixedOn, config);
      // 在這裡使用 fixedOn 註冊其他外掛
    },
  },
});
```

### 如何整合 mochawesome 或其他會嵌入截圖的 reporter？

這個外掛會把基準影像存放在預設的 `cypress/screenshots/` 目錄之外。有些 reporter（例如 `cypress-mochawesome-reporter`）則預期截圖會放在那個資料夾裡。

請使用 `processImgPath` task hook 來控制截圖檔案的存放位置。在 `setupNodeEvents` 中呼叫 `initPlugin` 之後覆寫它：

```ts
setupNodeEvents(on, config) {
  initVisualRegressionPlugin(on, config);

  // 覆寫路徑處理函式，讓 reporter 能存取截圖
  on('task', {
    'cp-visual-regression-diff-processImgPath': ({ path }: { path: string }) => {
      // 回傳新的路徑，或回傳原路徑以保留預設行為
      return path;
    },
  });
}
```

### 如何讓任何視覺差異（不論多細微）都導致測試失敗？

將 `maxDiffThreshold` 設為 `0`：

```ts
cy.matchImage({ maxDiffThreshold: 0 });
```

或透過 expose 變數全域設定：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionMaxDiffThreshold=0"
# Cypress <15.10（15.10 起棄用，16 已移除）
npx cypress run --env "pluginVisualRegressionMaxDiffThreshold=0"
```

### 為什麼影像比對成功後，實際截圖就被刪除了？

當影像相符時，`.actual.png` 檔案只是暫時性的，比對完成後就會被清掉，只會保留基準影像（沒有後綴的那個）。這樣可以避免儲存多餘的檔案。

當影像不相符時，`.actual.png` 檔案會被保留，並帶有與基準影像相同的外掛 metadata。您可以放心地將它重新命名或複製來覆蓋基準影像（例如在 CI 工作中開一個帶有更新後基準影像的 Pull Request），外掛會把它視為最新的基準影像，下次執行時不會再重寫它。

如果您需要讓實際截圖持續可供 reporter 存取（例如 `cypress-mochawesome-reporter`），請使用 `processImgPath` task hook 來控制截圖的儲存位置。請參考[如何整合 mochawesome 或其他會嵌入截圖的 reporter？](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images)

### 如何移除截圖檔名中的空格？

截圖檔名取自 Cypress 的測試標題，而標題中可能包含空格。若想使用不含空格的檔名，請在每次呼叫 `matchImage` 時傳入自訂的 `title` 選項：

```ts
cy.matchImage({ title: 'my-screenshot-without-spaces' });
```

若要套用到所有 `matchImage` 呼叫，請在 support 檔案（`cypress/support/commands.ts`）中覆寫這個指令：

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    title: Cypress.currentTest.titlePath.join(' ').replace(/\s+/g, '-'),
    ...options,
  }),
);
```

### 如何在影像檔名中加入瀏覽器名稱（用於跨瀏覽器測試）？

不同瀏覽器渲染字型與元素的方式可能略有差異。若要為每個瀏覽器分別保留基準影像，請在 support 檔案（`cypress/support/commands.ts`）中覆寫 `matchImage`，設定依瀏覽器區分的 `imagesPath`：

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    imagesPath: `{spec_path}/__image_snapshots__/${Cypress.browser.name}`,
    ...options,
  }),
);
```

這樣會為每個瀏覽器建立各自的影像目錄（例如 `__image_snapshots__/chrome/`、`__image_snapshots__/firefox/`）。

### 如何產生同時顯示基準、差異與實際影像的 HTML 報告？

這個外掛在 Cypress UI 中內建了視覺比對的覆蓋介面，在失敗的測試上點擊「See comparison」，就能並排檢視基準、差異與實際影像。

若需要用於 CI 或可分享的 HTML 報告，請整合像 [`cypress-mochawesome-reporter`](https://www.npmjs.com/package/cypress-mochawesome-reporter) 這類的 reporter。設定細節請參考[如何整合 mochawesome 或其他會嵌入截圖的 reporter？](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images)。
