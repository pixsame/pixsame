---
title: 使用
description: 配置 matchImage，并让您的基线保持整洁。
order: 2
reviewed: false
---

# 使用

该插件只添加一条命令：`matchImage`。测试这一侧的全部 API 就是它。

## 比对某个元素或整个页面

```ts
cy.get('.an-element-of-your-choice').matchImage();

// 或者对整个页面截图
cy.matchImage();
```

## 配置一次比对

选项按每次调用传入。完整列表及默认值在[配置](/docs/reference/configuration)页面。下面是大家最常先用到的几个：

```ts
cy.matchImage({
  // 透传给 Cypress 的截图 API
  screenshotConfig: { blackout: ['.element-to-be-blackouted'] },
  // pixelmatch 选项
  diffConfig: { threshold: 0.01 },
  // 自动创建尚不存在的基线（默认：true）
  createMissingImages: false,
  // 覆盖基线：true | 'failures-only' | false（默认：false）
  updateImages: false,
});
```

## 清理未使用的图片

测试被重命名或删除后，基线会越积越多。这样运行一次，会删掉所有没被任何测试碰过的插件图片：

```bash
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
```

这么做时请跑完整个测试套件。如果只筛选了几个 spec，被跳过的 spec 的基线也会被算作未使用。

在低于 15.10 的 Cypress 版本中还没有 `--expose`。请改用 `--env` 传入同一个键。

## 更多

其余内容都在[配置](/docs/reference/configuration)页面。有什么不清楚的，或者有想法，[GitHub discussions](https://github.com/pixsame/pixsame/discussions) 就是我们聊这些的地方。
