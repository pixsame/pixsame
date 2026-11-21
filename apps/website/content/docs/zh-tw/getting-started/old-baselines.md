---
title: 讓舊基準圖帶上版面
description: 為在記錄頁面版面之前儲存的基準圖補上版面，這樣失敗的比對就能說明什麼移動了。
order: 4
reviewed: false
---

# 讓舊基準圖帶上版面

舊基準圖仍然可用。新產生與被取代的基準圖還會記錄頁面版面，讓失敗的比對能說明哪些元素移動了，而不只是列出變化的區域。查看哪些基準圖還沒有版面：

```bash
npx pixsame baselines
```

接著讓 CLI 執行一次測試，由測試執行器取代基準圖。請在包含 `cypress.config.*` 或 `playwright.config.*` 的目錄中執行；它會顯示指令、執行前先詢問，並詢問它自己找不到的資訊（例如設定檔所在的目錄）：

```bash
npx pixsame baselines --update
```

這次執行會取代每一張基準圖，與 `pluginVisualRegressionUpdateImages=true` 相同。加上 `--failures-only` 則只取代失敗的基準圖。接著提交結果。
