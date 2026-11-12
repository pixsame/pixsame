---
title: Migration von @frsource
description: Wechseln Sie in einem Schritt von @frsource/cypress-plugin-visual-regression-diff zu @pixsame/cypress-plugin-visual-regression-diff.
order: 3
reviewed: false
---

# Migration von @frsource

## Warum das Paket umgezogen ist

Das Plugin hat als `@frsource/cypress-plugin-visual-regression-diff` angefangen. Jetzt gehört es zur [pixsame](https://github.com/pixsame)-Organisation, neben dem Manifest-Format und den anderen Tools, und wird als `@pixsame/cypress-plugin-visual-regression-diff` veröffentlicht. Der alte Name ist eingefroren. Dort erscheinen keine Releases mehr, Fixes erreichen Sie also erst, wenn Sie gewechselt haben.

## Was sich wirklich ändert

Der Name. `@pixsame` 1.0.0 ist exakt der Code von `@frsource` 4.3.0 mit einem anderen Etikett auf der Schachtel. Baseline-Bilder, Konfiguration, jeder `cy.*`-Command: alles unangetastet.

## Den migrate-Command verwenden

Die letzten `@frsource`-Releases bringen einen Command mit, der die Umbenennung für Sie erledigt. Er geht jede `package.json` unterhalb des aktuellen Verzeichnisses durch und tauscht die Abhängigkeit aus, schreibt Imports und Typreferenzen in Ihren Config- und Support-Dateien um und installiert dann mit dem Paketmanager neu, den er vorfindet:

```bash
npx @frsource/cypress-plugin-visual-regression-diff migrate
```

Bevor er irgendetwas schreibt, listet er die Dateien auf, die er anfassen wird, und wartet auf ein Ja.

| Flag           | Wirkung                                           |
| -------------- | ------------------------------------------------- |
| `--dry-run`    | Nur die Dateien auflisten, die sich ändern würden |
| `--yes`        | Rückfrage überspringen (in CI erforderlich)       |
| `--no-install` | Installationsschritt überspringen                 |

## Lieber von Hand?

Zwei Schritte. Paket tauschen, dann den Namen in Ihren Imports suchen und ersetzen:

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

Eine Stelle, die gern übersehen wird: Steht das Paket in `compilerOptions.types` einer `tsconfig.json`, benennen Sie es auch dort um, sonst beschwert sich `tsc` über eine Typdefinition, die es nicht findet.
