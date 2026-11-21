---
title: 让旧基线带上布局
description: 为在记录页面布局之前保存的基线补上布局，这样失败的对比就能说明什么发生了移动。
order: 4
reviewed: false
---

# 让旧基线带上布局

旧基线仍然可用。新生成和被替换的基线还会记录页面布局，这样失败的比较就能说明哪些元素移动了，而不只是列出变化的区域。查看哪些基线还没有布局：

```bash
npx pixsame baselines
```

然后让 CLI 运行一次测试，由测试运行器替换基线。请在包含 `cypress.config.*` 或 `playwright.config.*` 的目录中运行；它会显示命令、运行前先询问，并询问它自己找不到的信息（例如配置所在的目录）：

```bash
npx pixsame baselines --update
```

这次运行会替换每一张基线，与 `pluginVisualRegressionUpdateImages=true` 相同。加上 `--failures-only` 则只替换失败的基线。然后提交结果。
