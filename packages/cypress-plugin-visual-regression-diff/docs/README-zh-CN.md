---
reviewed: false
source: 5e965a234415c102
---

## 快速开始

### 安装

您可以使用自己常用的包管理器安装本库：

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

接下来，需要在两处引入本库：

- 首先，在 support 文件中（默认位于 `cypress/support/index.js`）：

```ts
// typescript / ES6
import '@pixsame/cypress-plugin-visual-regression-diff';

// javascript
require('@pixsame/cypress-plugin-visual-regression-diff');
```

- 其次，在 `cypress.config.js`（或 `cypress.config.ts`）中：

```ts
// typescript / ES6
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  // initPlugin 必须在实际使用它的配置块（e2e 或 component）中调用
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

就这么简单。接下来请看[用法](#usage)一节，了解如何使用本库。

## 用法

安装完成后，在测试中这样写即可使用：

```ts
cy.get('.an-element-of-your-choice').matchImage();
```

如果想对整个页面截图：

```ts
cy.matchImage();
```

`matchImage` 命令会截取一张截图，并与上一次运行生成的图片进行比对。一旦出现回归，测试将失败，并显示一个「See comparison」按钮，点击即可查看问题所在。

## 示例

安装时仍有问题？可以看看[本仓库的 examples 目录](https://github.com/pixsame/pixsame/tree/main/examples)，了解如何在您项目的 Cypress e2e 测试或组件测试环境中使用本插件。

## 自动清理未使用的图片

视觉回归插件生成的截图中，有些可能已经不再被任何测试使用，把它们清理掉会很有用。
通过 expose 变量开启此功能，即可释放存储空间 🚀：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## 运行清单（CI 集成）

从 1.1 起，每次运行都会写入一份 JSON 清单（manifest），列出每一次 `matchImage` 比对：它来自哪个测试、结果是通过、失败、创建还是更新了基线、差异比例，以及基线、`.actual.png` 和 `.diff.png` 文件相对于项目的路径。在这些条目之外，它还记录了运行发生的位置（CI 提供商、仓库、提交、pull request、运行 id）以及运行时使用的内容（浏览器、spec、配置文件、插件选项），因此读取该文件的工具可以针对正确的 PR 生成报告、下载正确的 artifact，或重新运行相同的比对。它面向的是在 Cypress 结束后运行的 CI 工具（PR 评论、审查看板、审批机器人）。

该格式是一个开放的、与运行器无关的标准，基于 [CTRF](https://ctrf.io) 构建，文档见 [visual-regression.dev/manifest](https://visual-regression.dev/manifest)。npm 包 [`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) 提供了 JSON Schema、TypeScript 类型、带校验的读取器、用于合并整次运行所有清单的合并器，以及面向那些自身不生成清单的工具的转换器（Playwright 的 `toHaveScreenshot`、Vitest、jest-image-snapshot、BackstopJS、CTRF 报告、普通图片文件）。请基于该包而不是本插件来构建您的工具。

默认情况下，该文件会与您的其他 Cypress 产物放在一起，位于 `<screenshotsFolder>/visual-regression-manifest.<testingType>.json`（例如 `cypress/screenshots/visual-regression-manifest.e2e.json`）。请将它与快照目录一起作为 CI artifact 上传。

```jsonc
{
  "reportFormat": "visual-regression-manifest",
  "specVersion": "1.0.0-beta.1",
  "createdAt": "2026-09-22T10:00:00.000Z",
  "updatedAt": "2026-09-22T10:03:12.481Z",
  "projectRoot": "/home/runner/work/app/app",
  "platform": {
    "osPlatform": "linux",
    "arch": "x64",
    "osRelease": "6.8.0-1021-azure",
  },
  "ci": {
    "provider": "github",
    "repositoryName": "acme/app",
    "repositoryUrl": "https://github.com/acme/app",
    "commit": "0f1e2d…", // pull_request 事件中：合并提交
    "ref": "refs/pull/42/merge",
    "branchName": "feat/new-header",
    "pullRequest": {
      "number": 42,
      "headSha": "9a8b7c…",
      "headRef": "feat/new-header",
      "baseRef": "main",
    },
    "event": "pull_request",
    "buildId": "1234567890",
    "buildName": "CI",
    "buildUrl": "https://github.com/acme/app/actions/runs/1234567890/attempts/1",
    "runAttempt": "1",
    "job": "e2e",
    "workspace": "/home/runner/work/app/app",
  },
  "tool": {
    "name": "@pixsame/cypress-plugin-visual-regression-diff",
    "version": "1.1.0",
  }, // 写入该文件的工具
  "options": { "updateImages": "failures-only" }, // 全局 pluginVisualRegression* 选项，已去掉前缀
  "runner": {
    "name": "cypress",
    "version": "16.1.0",
    "testingType": "e2e",
    "mode": "run",
    "configFile": "cypress.config.ts",
    "browser": {
      "name": "chrome",
      "version": "130.0.0.0",
      "family": "chromium",
      "headless": true,
    },
    "specs": ["cypress/e2e/home.cy.ts"],
    "specPattern": "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    "baseUrl": "http://localhost:3000",
    "viewport": { "width": 1280, "height": 720 },
  },
  "summary": {
    "entries": 1,
    "passed": 0,
    "failed": 1,
    "missingBaseline": 0,
    "created": 0,
    "updated": 0,
    "approved": 0,
    "needsHuman": 1,
  },
  "entries": [
    {
      "name": "home page renders_#0",
      "test": {
        "filePath": "cypress/e2e/home.cy.ts",
        "titlePath": ["home page", "renders"],
        "retry": 0,
      },
      "status": "failed",
      "comparison": { "diffRatio": 0.0231, "threshold": 0.01 },
      "images": {
        "baseline": {
          "path": "cypress/e2e/__image_snapshots__/home page renders_#0.png",
          "width": 1280,
          "height": 720,
        },
        "actual": {
          "path": "cypress/e2e/__image_snapshots__/home page renders_#0.actual.png",
          "width": 1280,
          "height": 720,
        },
        "diff": {
          "path": "cypress/e2e/__image_snapshots__/home page renders_#0.diff.png",
        },
      },
      "baselineWritten": false,
      "recordedAt": "2026-09-22T10:03:12.480Z",
      "platform": {
        "osPlatform": "linux",
        "arch": "x64",
        "browser": {
          "name": "chrome",
          "version": "130.0.0.0",
          "family": "chromium",
          "headless": true,
        },
      },
      "viewport": { "width": 1280, "height": 720 },
      "options": {
        "imagesPath": "{spec_path}/__image_snapshots__",
        "maxDiffThreshold": 0.01,
        "diffConfig": {},
        "createMissingImages": true,
        "updateImages": false,
        "forceDeviceScaleFactor": true,
        "screenshotConfig": {},
      },
      "renderer": {
        "backend": "native",
        "browser": "chrome",
        "browserVersion": "130.0.0.0",
      },
      "hashes": {
        "baseline": "3b7e…", // `images` 中所列文件的 sha256，仅限实际存在的文件
        "actual": "9d21…",
        "diff": "c0ff…",
      },
      "message": "Image diff factor (2.31%) is bigger than maximum threshold option 1%.",
    },
  ],
}
```

| `status`           | 含义                                                    | `images.actual.path` | `images.diff.path` |
| ------------------ | ------------------------------------------------------- | -------------------- | ------------------ |
| `passed`           | 在阈值范围内                                            | `null`               | `null`             |
| `failed`           | 超过阈值，保留 `.actual.png` 和 `.diff.png` 供审查      | 路径                 | 路径               |
| `missing-baseline` | 没有基线且 `createMissingImages: false`                 | 路径                 | `null`             |
| `created`          | 没有基线，`.actual.png` 成为基线                        | `null`               | `null`             |
| `updated`          | 基线被覆盖（`updateImages: true` 或 `'failures-only'`） | `null`               | `null`             |
| `approved`         | 在有头模式的审查界面中替换了基线（「Replace image」）   | `null`               | `null`             |

运行级字段：

| 字段                     | 含义                                                                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createdAt`, `updatedAt` | 运行开始的时间以及文件最后一次被重写的时间（ISO 8601）                                                                                                                                                                |
| `platform`               | `osPlatform`（`linux`、`darwin`、`win32`）、`arch`、内核的 `osRelease`，以及在 run 模式下，运行测试的机器的可读 `osVersion`                                                                                           |
| `tool`                   | 写入该文件的工具：本插件及其版本                                                                                                                                                                                      |
| `ci`                     | 在 GitHub Actions 和 GitLab CI 上从环境变量中检测得到；在其他 CI 系统上（只设置了 `CI`）为 `{ "provider": null }`，不在 CI 上时为 `null`。只有所列出的键会从环境中复制                                                |
| `options`                | 来自 `expose`/`env` 的所有 `pluginVisualRegression*` 选项，已去掉前缀，值保持配置时的原样（CLI 传入的值仍是字符串）                                                                                                   |
| `runner`                 | 运行测试的工具。`mode` 为 `run` 或 `open`；`browser` 是启动的浏览器；`specs` 仅在 run 模式下可知；`configFile` 和 `specs` 相对于 `projectRoot`。Cypress Cloud 运行还会包含 `cloud.runUrl`、`group`、`tag`、`parallel` |
| `summary`                | 各状态的条目数量；`needsHuman` 等于 `failed` + `missingBaseline`，因此消费者无需读取条目即可做出决定                                                                                                                  |

面向消费者的说明：

- 所有路径都相对于 `projectRoot`，并使用 `/` 作为分隔符；当 `imagesPath` 为绝对路径时，它们可能指向项目之外（`../…`）。`projectRoot` 是 Cypress 项目目录，不一定是仓库根目录：`ci.workspace` 是 checkout 目录，因此 `relative(ci.workspace, projectRoot)` 即为仓库内的路径前缀。
- `failed` 和 `missing-baseline` 是需要人工处理的条目：将 `images.actual.path` 复制覆盖到 `images.baseline.path` 即可批准它们。
- `baselineWritten` 表示该截图是否改动了工作区，与 `status` 无关。
- 每个条目都带有自己的 `platform` 和 `viewport`，因此在拼接多份清单后，仍能区分来自机器矩阵中不同机器的条目。条目上的 `options` 是 `matchImage` 的精确输入（`imagesPath` 保留未展开的变量）；`comparison` 是比对结果。
- `platform` 是测试运行的位置，`renderer` 是像素的来源。目前每张截图都由 Cypress 驱动的浏览器拍摄，因此 `renderer.backend` 为 `native`，`renderer.browser` 与 `platform.browser.name` 相同。该字段的存在是为了让本地浏览器以外的渲染器（固定版本的 Docker 镜像、托管渲染器）能通过 `rendererVersion` 和 `imageDigest` 标识自己，也为了让不得不回退到本地浏览器的运行能用 `renderer.fallback: true` 标记出来。请将渲染器不同的条目视为不同的基线。
- `hashes` 保存 `images` 中每个在磁盘上存在的文件的 sha256。可用它跳过重新上传未变化的基线、检查 artifact 是否与清单一致，或找出产生了完全相同像素的两个条目。
- 映射到 pull request：使用 `ci.repositoryName` 和 `ci.pullRequest.number`。在 GitHub 的 `pull_request` 事件中，`ci.commit` 是临时的合并提交，因此任何需要推送到 PR 分支的操作都必须使用 `ci.pullRequest.headSha` / `headRef`。工作流 artifact 可通过 `ci.buildId` 和 `ci.runAttempt` 找到。
- 重现一次运行：`npx cypress run --<runner.testingType> --browser <runner.browser.name> --config-file <runner.configFile> --spec <runner.specs joined with ,>`，再为 `options` 中的每一项加上一个 `--expose "pluginVisualRegression<Key>=<value>"`。清单将这些内容按组成部分存储，而不是存成一条命令字符串，因此 shell 引号和包管理器由您自行决定。
- 该文件在每次比对后都会重写，因此即使运行被中止，它也是完整的。当 spec 在多台机器上并行运行时，每台机器都会写入自己的清单；`**/visual-regression-manifest{,.*}.json`（包中的 `MANIFEST_FILE_GLOB`）可以在 artifact 中找到所有清单，`visual-regression-manifest` 中的 `readManifestFiles` + `mergeManifests` 会把它们合并成一个列表，并让较晚的 CI attempt 覆盖较早的。
- 只有 `runner` 块和 `options` 的键是 Cypress 特有的；格式的其余部分与所有其他写入方共享。`specVersion` 遵循 semver，仅在格式发生破坏性变更时才提升主版本号；消费者应忽略不认识的键。由于字段名遵循 CTRF，包中的 `toCtrf` 可以把清单转换为 [CTRF](https://ctrf.io) 报告，供读取该格式的工具使用。
- 为方便起见，`Manifest*` 类型从 `@pixsame/cypress-plugin-visual-regression-diff/plugins` 重新导出；它们就是 `visual-regression-manifest` 中的类型。

清单默认开启。如需将它写到其他位置（路径相对于项目根目录解析）或关闭它，请使用 `pluginVisualRegressionManifestPath` 键（`false` 表示禁用，其他行为不变）：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionManifestPath=reports/visual-regression.json"
npx cypress run --expose "pluginVisualRegressionManifestPath=false"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress run --env "pluginVisualRegressionManifestPath=false"
```

如果您使用自定义路径同时运行 e2e 和组件测试，请自行在路径中加入测试类型；否则两次运行会互相覆盖对方的文件。

## 配置

插件可以通过以下方式配置：

- 将配置对象作为参数传给 `matchImage` 命令：

```ts
cy.matchImage({
  // 截图配置，会原样传给 Cypress 的 screenshot 方法：https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // 默认值：{ }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch 选项，参见：https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // 默认值：{ includeAA: true }（2.0 改用 pixelmatch 自身的 includeAA: false，参见下文 "Reducing cross-OS rendering noise"）
  diffConfig: {
    threshold: 0.01,
  },
  // 基线图片缺失时是否自动创建
  // 默认值：true
  createMissingImages: false,
  // 是否自动更新图片——在 CI 中很有用
  // - true：不做比对，直接覆盖所有基线图片（最快）
  // - 'failures-only'：先比对，仅当差异超过阈值时才更新基线
  // - false：从不自动更新基线图片
  // 默认值：false
  updateImages: true,
  // 存放截图的目录路径
  // 相对路径以项目根目录为基准解析
  // 支持绝对路径（unix 和 windows 系统均可）
  // 插件会根据操作系统对路径分隔符做规范化，请始终使用 / 作为分隔符，例如 windows 盘符写法：C:/my-directory/nested
  // 路径中可以使用一个特殊变量：
  // - {spec_path} - 从项目根目录到当前 spec 文件所在目录的相对路径（例如 `/src/components/my-tested-component`）
  // 默认值：'{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // 差异超过该阈值时测试失败
  // 默认值：0.01
  maxDiffThreshold: 0.1,
  // 强制将缩放比例设为 "1"
  // 可解决在 Mac Retina 等高分屏上截图被放大 2 倍的问题
  // 适用于 Chrome 和 Chromium（2.0 将其扩展到 Edge 和 Firefox，这会使它们在高分屏上的基线图片更新一次）
  // 默认值：true
  forceDeviceScaleFactor: false,
  // 应用确定性渲染预设，参见下文 "Reducing cross-OS rendering noise"
  // 在单次调用中，它只控制为截图注入页面的 CSS（光标、动画、滚动条）；
  // 浏览器开关是进程级的，由全局选项 pluginVisualRegressionDeterministicRendering 决定
  // 默认值：false（2.0 起默认开启）
  deterministicRendering: true,
  // 用于生成图片文件名的标题
  // 默认值：Cypress.currentTest.titlePath（即您的测试标题）
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // 指定一张自定义图片的路径用于比对
  // 而不是与上一次运行生成的图片进行比对
  // 默认值：undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- 通过[全局 expose 配置](https://on.cypress.io/expose)（Cypress 15.10+）。配置键名与上面配置对象的键名相同，只是加上了 `pluginVisualRegression` 前缀，例如：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

多个选项请放在同一个参数里，用逗号分隔。如果 `--expose`（或 `--env`）重复出现，Cypress 只会保留最后一个。

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
// cypress.config.ts（Cypress <15.10，新版本中已弃用）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

更多设置 expose 变量的方式[请参考这里](https://on.cypress.io/expose)。

## 批量审查模式

批量审查模式（Batch Review Mode）让您可以完整跑完整个测试套件，而不会在第一个视觉差异失败处停下。所有失败的快照会被收集起来，在测试结束后通过一个交互式审查界面展示——您可以批量通过或跳过这些变更。

### 有头模式（非 CI 环境）下的额外功能

启用后，Cypress 测试运行器右下角会出现一个悬浮操作按钮（FAB）。测试运行过程中：

- 每当某次 `matchImage()` 调用的差异超过阈值，FAB 上的计数徽标会加一，而不是立即抛出错误。
- 所有测试结束后，会抛出一个包含失败总数的错误。
- 点击 FAB 会打开一个轮播面板，您可以逐一并排审查每个失败的快照（新图 vs 旧图），然后选择**替换**基线或**跳过**该变更。

![批量审查模式演示](https://raw.githubusercontent.com/pixsame/pixsame/main/assets/batch-review-mode.gif)

> 注意：批量模式将在下一个主版本中成为默认行为。如需保留旧行为，请务必将该配置项设为 `false`（详见下文）。

### 如何启用

批量审查模式是一个全局选项（不能直接传给 `matchImage`）。通过 `pluginVisualRegressionBatchReviewMode` 键启用：

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

```ts
// cypress.config.ts（Cypress 15.10+）
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

```ts
// cypress.config.ts（Cypress <15.10，新版本中已弃用）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

### 审查已通过的图片

与基线有差异但仍在 `maxDiffThreshold` 范围内的图片不会导致测试失败，但同样会被收集。轮播面板中有一个 **Show passing** 复选框，勾选后即可浏览这些图片（每张都带有 `passed` 标记），并同样可以替换它们的基线，例如用来消除逐渐累积的细微偏差。

该复选框默认不勾选。可通过 `pluginVisualRegressionBatchReviewModeShowPassingImages` 键将其设为默认勾选：

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true" --expose "pluginVisualRegressionBatchReviewModeShowPassingImages=true"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true,pluginVisualRegressionBatchReviewModeShowPassingImages=true"
```

```ts
// cypress.config.ts（Cypress 15.10+）
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
    pluginVisualRegressionBatchReviewModeShowPassingImages: true,
  },
});
```

在运行器中切换该复选框的状态会记录在浏览器的 local storage 中，后续运行时将优先于配置中的值。

## Reducing cross-OS rendering noise

浏览器会把文字光栅化交给操作系统处理（macOS 上是 CoreText，Windows 上是 DirectWrite，Linux 上是 FreeType），因此同一个页面在开发者的笔记本和 Linux CI 机器上永远不会渲染出逐字节完全一致的结果。插件无法彻底消除这种差异，但 `deterministicRendering` 预设可以去掉其中产生于浏览器内部的那部分噪声。

该预设在 1.x 中是可选的，默认关闭。2.0 会默认开启，所以现在启用它，就相当于提前获得 2.0 的行为，无需任何其他改动。

### 如何启用

浏览器开关是进程级的，因此该预设是一个全局选项。通过 `pluginVisualRegressionDeterministicRendering` 键启用：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress run --env "pluginVisualRegressionDeterministicRendering=true"
```

```ts
// cypress.config.ts（Cypress 15.10+）
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionDeterministicRendering: true,
  },
});
```

```ts
// cypress.config.ts（Cypress <15.10，新版本中已弃用）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionDeterministicRendering: true,
  },
});
```

首次运行时，与未启用该预设时创建的基线相比会出现一些细微差异，因为文字将不再使用 hinting 进行光栅化。请使用 `pluginVisualRegressionUpdateImages=true`（或 `'failures-only'`）运行一次，或在批量审查模式中批准这些变更，然后提交结果。

### 它做了什么

- **Chrome、Chromium、Edge** 启动时会带上 `--font-render-hinting=none --disable-font-subpixel-positioning --disable-lcd-text --force-color-profile=srgb --disable-gpu`（文字不使用操作系统 hinting 和子像素技巧，不做色彩管理，使用 CPU 光栅化），无头模式下还会加上 `--hide-scrollbars`。该列表以 `DETERMINISTIC_RENDERING_CHROMIUM_ARGS` 之名从 `@frsource/cypress-plugin-visual-regression-diff/constants` 导出。
- **Firefox** 会设置 `gfx.webrender.software` 偏好项（CPU 渲染）。Firefox 没有跨平台的字体 hinting 开关，因此不同操作系统之间的文字仍可能存在差异。
- **所有浏览器**：在 `matchImage` 截图期间，会向被测页面注入一个 `<style>` 元素，用于隐藏文本光标、禁用 CSS 过渡、动画和平滑滚动，并隐藏滚动条。截图完成后立即移除。

该预设无法解决的问题：各操作系统上字体文件和回退字体不同（典型的 Arial 与 Liberation Sans 问题）、emoji 字体、WebKit 和 Firefox 的文字光栅化，以及 WebGL 绘制的图像。对于这些情况，请为每个平台各保留一份基线（参见 `title` 和 `imagesPath` 选项，以及关于浏览器名称的 FAQ 条目），或者在与 CI 相同的环境中生成基线。

**Electron** 会忽略插件设置的开关，因此在 Electron 中该预设只会注入 CSS，并在浏览器启动时打印一条提示。请改为通过环境变量传入这些开关：

```bash
ELECTRON_EXTRA_LAUNCH_ARGS="--font-render-hinting=none --disable-font-subpixel-positioning --disable-lcd-text --force-color-profile=srgb --disable-gpu --hide-scrollbars" npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true"
```

**WebGL**：`--disable-gpu` 可能导致依赖 WebGL 的页面无法获得渲染上下文。要么保持该预设关闭，要么在您自己的 `before:browser:launch` 处理函数中加入 `--use-gl=angle --use-angle=swiftshader`（较新的 Chrome 还需要 `--enable-unsafe-swiftshader`），并通过 [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix) 将其与插件自带的处理函数组合起来。

**截图钩子**：插件会为它拍摄的每张截图传入自己的 `onBeforeScreenshot` 和 `onAfterScreenshot`。通过 `screenshotConfig` 传入的钩子仍会被调用；通过 `Cypress.Screenshot.defaults()` 全局设置的钩子则不会。

### 抗锯齿像素：搭配 `includeAA: false`

1.x 中的比对仍然使用 `includeAA: true` 运行 `pixelmatch`，因此每个渲染略有不同的抗锯齿边缘像素都会计入差异比例。这是跨操作系统噪声的另一半，而该预设并不处理它。请搭配 `includeAA: false`（pixelmatch 自身的默认值，抗锯齿像素会被检测并跳过）使用——2.0 会将其设为默认值：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true,pluginVisualRegressionDiffConfig={\"includeAA\":false}"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress run --env "pluginVisualRegressionDeterministicRendering=true,pluginVisualRegressionDiffConfig={\"includeAA\":false}"
```

```ts
cy.matchImage({ diffConfig: { includeAA: false } });
```

启用后差异比例会变小，因此一些之前失败的比对现在会通过。基线图片不受影响。

### 单次调用

`matchImage` 的 `deterministicRendering` 选项只控制注入的 CSS；浏览器开关仍然由全局选项决定。如需对单张截图跳过该 CSS（例如您想捕获的正是动画的结束状态）：

```ts
cy.matchImage({ deterministicRendering: false });
```

或者只为某一张截图注入 CSS，而不在全局启用该预设：

```ts
cy.matchImage({ deterministicRendering: true });
```

## 常见问题

### 为什么截图与我 Cypress 配置中设置的 `viewport` 不一致？

Cypress 的截图默认不会按视口尺寸裁剪。您可以这样修改此行为：

- 全局修改，更改默认截图配置：`Cypress.Screenshot.defaults({ capture: 'viewport' });`
- 局部修改，将截图配置直接传给 `.matchImage` 命令：`cy.matchImage({ screenshotConfig: { capture: 'viewport' } });`

### 升级本插件版本后，我所有的基线图片都被自动更新了，这是为什么？

有时我们需要对图片比对或图片生成算法做破坏性变更。为了让您的升级过程尽可能顺畅，插件会自动更新您的基线图片。升级插件后，只需把这些图片提交到仓库即可！

### `cypress run` 和 `cypress open` 生成的截图不一样，该怎么解决？

这通常是无头模式和有头模式之间设备像素比（device pixel ratio）不同导致的。使用 `forceDeviceScaleFactor` 选项将缩放比例统一为 `1`：

```ts
cy.matchImage({ forceDeviceScaleFactor: true });
```

或者通过 expose 变量全局设置：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionForceDeviceScaleFactor=true"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress run --env "pluginVisualRegressionForceDeviceScaleFactor=true"
```

如果视口尺寸差异持续存在，可以考虑在 `setupNodeEvents` 中显式设置浏览器窗口大小（通过 [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix) 将其与插件自带的 `before:browser:launch` 处理函数组合起来）：

```ts
on('before:browser:launch', (browser, launchOptions) => {
  if (browser.family === 'chromium' && browser.isHeadless) {
    launchOptions.args.push('--window-size=1280,720');
  }
  return launchOptions;
});
```

如果两次运行发生在不同的操作系统上（macOS 笔记本与 Linux CI 机器），剩余的差异来自字体渲染。参见 [Reducing cross-OS rendering noise](#reducing-cross-os-rendering-noise)。

### 如何与其他同样在 `setupNodeEvents` 中注册事件的 Cypress 插件一起使用？

Cypress 每个事件只支持一个处理函数。如果多个插件注册了同一个事件（例如 `after:screenshot`），只有最后注册的那个会被调用。要安全地组合多个插件，请使用 [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix)：

```ts
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';
import fix from 'cypress-on-fix';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const fixedOn = fix(on);
      initVisualRegressionPlugin(fixedOn, config);
      // 在此处使用 fixedOn 注册其他插件
    },
  },
});
```

### 如何与 mochawesome 或其他会内嵌截图的报告工具集成？

本插件将基线图片存放在默认的 `cypress/screenshots/` 目录之外。而有些报告工具（如 `cypress-mochawesome-reporter`）要求截图位于该目录下。

可以使用 `processImgPath` task 钩子控制截图文件的存放位置。在 `setupNodeEvents` 中调用 `initPlugin` 之后覆盖它：

```ts
setupNodeEvents(on, config) {
  initVisualRegressionPlugin(on, config);

  // 覆盖路径处理函数，让报告工具能够访问到截图
  on('task', {
    'cp-visual-regression-diff-processImgPath': ({ path }: { path: string }) => {
      // 返回一个新路径；返回原路径则保持默认行为
      return path;
    },
  });
}
```

### 如何让任何视觉差异（无论多小）都导致测试失败？

将 `maxDiffThreshold` 设为 `0`：

```ts
cy.matchImage({ maxDiffThreshold: 0 });
```

或者通过 expose 变量全局设置：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionMaxDiffThreshold=0"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress run --env "pluginVisualRegressionMaxDiffThreshold=0"
```

### 为什么图片比对成功后实际截图会被删除？

当图片匹配时，`.actual.png` 文件只是临时文件，比对完成后会被清理，只保留基线图片（无后缀）。这样可以避免存储冗余文件。

当图片不匹配时，`.actual.png` 文件会被保留，并且携带与基线图片相同的插件元数据。您可以放心地将它重命名或复制覆盖到基线图片上（例如在 CI 任务中用更新后的基线创建一个 Pull Request）——插件会将其视为最新的基线，下次运行时不会重新生成。

如果您需要让实际截图对报告工具（例如 `cypress-mochawesome-reporter`）保持可访问，请使用 `processImgPath` task 钩子来控制截图的存放位置。参见[如何与 mochawesome 或其他会内嵌截图的报告工具集成？](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images)

### 如何去掉截图文件名中的空格？

截图文件名来自 Cypress 测试标题，其中可能包含空格。如果想使用不含空格的文件名，可以在每次调用 `matchImage` 时传入自定义的 `title` 选项：

```ts
cy.matchImage({ title: 'my-screenshot-without-spaces' });
```

如需对所有 `matchImage` 调用全局生效，可以在 support 文件（`cypress/support/commands.ts`）中覆盖该命令：

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    title: Cypress.currentTest.titlePath.join(' ').replace(/\s+/g, '-'),
    ...options,
  }),
);
```

### 如何在图片文件名中包含浏览器名称（用于跨浏览器测试）？

不同浏览器对字体和元素的渲染可能略有差异。要为每个浏览器单独保存基线图片，可以在 support 文件（`cypress/support/commands.ts`）中覆盖 `matchImage`，设置一个与浏览器相关的 `imagesPath`：

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    imagesPath: `{spec_path}/__image_snapshots__/${Cypress.browser.name}`,
    ...options,
  }),
);
```

这样每个浏览器都会有独立的图片目录（例如 `__image_snapshots__/chrome/`、`__image_snapshots__/firefox/`）。

### 如何生成一份同时展示基线、差异和实际截图的 HTML 报告？

本插件在 Cypress 界面中内置了视觉比对浮层——在失败的测试上点击「See comparison」，即可并排查看基线、差异和实际截图。

如需用于 CI 或便于分享的 HTML 报告，可以与 [`cypress-mochawesome-reporter`](https://www.npmjs.com/package/cypress-mochawesome-reporter) 之类的报告工具集成。配置细节参见[如何与 mochawesome 或其他会内嵌截图的报告工具集成？](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images)。
