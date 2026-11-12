---
title: 清单 schema
description: 与运行器无关的运行清单，pixsame 工具都会读写它。规范位于 visual-regression.dev。
order: 2
reviewed: false
---

# 清单 schema

清单（manifest）是一个 JSON 文件，记录一次测试运行中进行的每一次截图比对：比对了什么、对照的是哪份基线、结果如何。测试工具负责写入它。之后的一切，PR 评论机器人、审查看板、批准工具，都读这个文件，而不必去理解运行器本身。

这个格式刻意不做成 pixsame 专属的东西。它是开放的，不绑定 pixsame，也不绑定任何运行器，位于开源仓库 [visual-regression](https://github.com/visual-regression/visual-regression) 中的 [visual-regression.dev/manifest](https://visual-regression.dev/manifest)，连同字段参考、其他运行器的转换器和一个查看器。在 npm 上，[`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) 提供 JSON Schema、类型定义，以及读取器、写入器和合并器。

每个 pixsame 工具都会读写它。GitHub App 和托管平台将接受任何能产出清单的运行器写出的清单，无论是我们的还是别人的。
