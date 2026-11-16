---
title: 从 @frsource 迁移
description: 一步完成从 @frsource/cypress-plugin-visual-regression-diff 到 @pixsame/cypress-plugin-visual-regression-diff 的迁移。
order: 3
reviewed: false
---

# 从 @frsource 迁移

## 为什么要迁移包

这个插件最初以 `@frsource/cypress-plugin-visual-regression-diff` 的名字发布。现在它归属于 [pixsame](https://github.com/pixsame) 组织，与清单格式及其他工具放在一起，以 `@pixsame/cypress-plugin-visual-regression-diff` 的名字发布。旧名字已经冻结。那边不会再有新版本，所以只有切换过来，修复才能到您手上。

## 实际变了什么

名字。`@pixsame` 1.0.0 就是 `@frsource` 4.3.0 的代码原封不动，只是盒子上换了个标签。基线图片、配置、所有 `cy.*` 命令：全都没动。

## 使用 migrate 命令

`@frsource` 的最后几个版本自带一条命令，替您完成重命名。它会遍历当前目录下的每个 `package.json` 并替换依赖项，改写配置文件和 support 文件中的导入语句与类型引用，然后用它找到的包管理器重新安装：

```bash
npx @frsource/cypress-plugin-visual-regression-diff migrate
```

在写入任何内容之前，它会先打印出将要改动的文件，然后等您点头。

| 参数           | 作用                             |
| -------------- | -------------------------------- |
| `--dry-run`    | 仅列出将被修改的文件             |
| `--yes`        | 跳过确认提问（在 CI 中必须使用） |
| `--no-install` | 跳过安装步骤                     |

## 迁移之后：让旧基线带上布局

旧基线仍然可用。新生成和被替换的基线还会记录页面布局，这样失败的比较就能说明哪些元素移动了，而不只是列出变化的区域。查看哪些基线还没有布局：

```bash
npx pixsame baselines
```

然后用你已熟悉的更新选项运行一次测试（Cypress 用 `pluginVisualRegressionUpdateImages=true`，Playwright 用 `--update-snapshots`），并提交结果。仍然通过的基线只有在 `true` 时才会被替换；`'failures-only'` 只替换失败的基线。

## 想手动迁移？

两步。先替换依赖包，然后在导入语句里查找替换包名：

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

一个常被漏掉的地方：如果某个 `tsconfig.json` 的 `compilerOptions.types` 里列出了这个包，那里也要改名，否则 `tsc` 会抱怨找不到类型定义。
