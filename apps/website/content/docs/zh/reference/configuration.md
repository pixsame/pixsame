---
title: 配置
description: pixsame Cypress 插件的所有选项，支持按调用或全局设置，另含批量审查模式。
order: 1
reviewed: false
---

# 配置

每个选项都有两个用法：按每次调用，作为参数传给 `matchImage`；或者为整个运行设置一次。全局键名就是按调用的名字前面加上 `pluginVisualRegression`，所以 `updateImages` 变成 `pluginVisualRegressionUpdateImages`。

## 选项

- 按每次调用，作为参数传给 `matchImage`。注释里写着默认值：

```ts
cy.matchImage({
  // 截图配置，会直接传给 Cypress 的截图方法：https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // 默认值：{ }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch 选项，参见：https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // 默认值：{ includeAA: true }
  diffConfig: {
    threshold: 0.01,
  },
  // 是否自动创建缺失的基线图片
  // 默认值：true
  createMissingImages: false,
  // 是否自动更新图片——在 CI 中很有用
  // - true：不做比对，直接覆盖所有基线图片（最快）
  // - 'failures-only'：先比对，仅当差异超过阈值时才更新基线
  // - false：从不自动更新基线图片
  // 默认值：false
  updateImages: true,
  // 截图图片的存放目录
  // 相对路径相对于项目根目录解析
  // 支持绝对路径（unix 和 windows 系统均可）
  // 插件会根据操作系统规范化路径分隔符，您应始终使用 / 作为路径分隔符，例如 windows 盘符写法：C:/my-directory/nested
  // 路径中可以使用一个特殊变量：
  // - {spec_path}：从项目根目录到当前 spec 文件所在目录的相对路径（例如 `/src/components/my-tested-component`）
  // 默认值：'{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // 差异阈值上限，超过即判定测试失败
  // 默认值：0.01
  maxDiffThreshold: 0.1,
  // 强制把缩放比例设为 "1"
  // 可避免在 Mac Retina 等高密度屏幕上截图被放大 2 倍
  // 默认值：true
  forceDeviceScaleFactor: false,
  // 用于给图片文件命名的标题
  // 默认值：Cypress.currentTest.titlePath（您的测试标题）
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // 传入一张自定义图片的路径，用它来做比对
  // 而不是与上一次运行的图片比对
  // 默认值：undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- 为整个运行，通过 Cypress 的 [expose 配置](https://on.cypress.io/expose)（Cypress 15.10+）。键名与上面相同，加上 `pluginVisualRegression` 前缀：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10（15.10 起已废弃，16 中移除）
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

多个选项放在同一个参数里，用逗号分隔。不要重复传 `--expose`（或 `--env`）：Cypress 只保留最后一个，其余的会被悄无声息地丢掉。

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
// cypress.config.ts（Cypress <15.10，在更新的版本中已废弃）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

设置 expose 变量的其他方式，Cypress 在[这里](https://on.cypress.io/expose)有文档。

## 清理未使用的图片

重命名或删除一个测试，它的基线会留在原地。带上这个键运行一次，插件会删掉这次运行中没被任何测试碰过的所有插件图片。这么做时请跑完整个套件，否则被跳过的 spec 的基线也会一起没掉：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10（15.10 起已废弃，16 中移除）
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## 批量审查模式

正常情况下，快照一超过阈值就会当场在测试里抛错。批量审查模式则让套件一直跑到结束，收集所有失败的快照，最后只抛一次错并给出总数。在有界面（headed）模式下，运行结束后会出现一个轮播视图，您逐个过一遍失败项，对每条基线选择替换或跳过。它是全局选项，所以不能传给 `matchImage`。用 `pluginVisualRegressionBatchReviewMode` 开启；如果您希望通过的图片也出现在轮播里，再加上 `pluginVisualRegressionBatchReviewModeShowPassingImages`：

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10（15.10 起已废弃，16 中移除）
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

Cypress 插件页面的[批量审查模式一节](/products/cypress-plugin#batch-review-mode)有审查界面的演示。
