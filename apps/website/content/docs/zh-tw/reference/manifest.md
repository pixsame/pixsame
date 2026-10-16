---
title: Manifest 結構
description: 不依賴特定 runner 的執行 manifest，pixsame 工具都會讀寫它。規格位於 visual-regression.dev。
order: 2
reviewed: false
---

# Manifest 結構

Manifest 是一份 JSON 檔，記錄一次測試執行中做過的每一回截圖比對：比了什麼、對照哪個基準、結果如何。測試工具負責寫入。之後的所有東西，不管是 PR 留言機器人、審閱儀表板還是核准工具，都讀這個檔案就好，不必去理解 runner 本身。

這個格式刻意不做成 pixsame 專屬的東西。它是開放的，不綁定 pixsame，也不綁定任何 runner，放在 [visual-regression](https://github.com/visual-regression/visual-regression) 儲存庫裡的 [visual-regression.dev/manifest](https://visual-regression.dev/manifest)，連同欄位參考、其他 runner 的轉換器和一個檢視器。npm 上的 [`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) 則有 JSON Schema、型別，以及 reader、writer 與 merger。

每一個 pixsame 工具都讀寫它。GitHub App 與託管平台將會接受任何 runner 產出的 manifest，不管是我們的還是別人的。
