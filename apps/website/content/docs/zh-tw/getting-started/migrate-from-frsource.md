---
title: 從 @frsource 遷移
description: 一步就能從 @frsource/cypress-plugin-visual-regression-diff 換到 @pixsame/cypress-plugin-visual-regression-diff。
order: 3
reviewed: false
---

# 從 @frsource 遷移

## 套件為什麼搬家

這個外掛一開始叫 `@frsource/cypress-plugin-visual-regression-diff`。現在它搬進了 [pixsame](https://github.com/pixsame) 組織，和 manifest 格式以及其他工具放在一起，以 `@pixsame/cypress-plugin-visual-regression-diff` 的名稱發佈。舊名稱已經凍結，不會再有新版本發到那裡，所以你得切換過來才拿得到修正。

## 實際上改了什麼

名字。`@pixsame` 1.0.0 就是 `@frsource` 4.3.0 一模一樣的程式碼，只是盒子上換了標籤。基準影像、設定、每一個 `cy.*` 指令：全都沒動。

## 使用 migrate 指令

最後幾個 `@frsource` 版本內建了一個指令，可以替你完成更名。它會走過目前目錄底下所有的 `package.json` 並換掉相依套件，改寫你 config 與 support 檔案中的 import 與型別參照，然後用它找到的套件管理工具重新安裝：

```bash
npx @frsource/cypress-plugin-visual-regression-diff migrate
```

在寫入任何東西之前，它會先印出準備動到的檔案，等你說好。

| 旗標           | 作用                       |
| -------------- | -------------------------- |
| `--dry-run`    | 只列出會被修改的檔案       |
| `--yes`        | 略過詢問（在 CI 中為必要） |
| `--no-install` | 略過安裝步驟               |

## 想自己手動處理？

兩步。先換掉套件，再把 import 裡的名稱搜尋取代：

```bash
npm uninstall @frsource/cypress-plugin-visual-regression-diff
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff
```

```diff
-import '@frsource/cypress-plugin-visual-regression-diff';
+import '@pixsame/cypress-plugin-visual-regression-diff';
-import { initPlugin } from '@frsource/cypress-plugin-visual-regression-diff/plugins';
+import { initPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';
```

有一個地方常被漏掉：如果你在某個 `tsconfig.json` 的 `compilerOptions.types` 裡列了這個套件，那裡也要改名，不然 `tsc` 會抱怨找不到型別定義。
