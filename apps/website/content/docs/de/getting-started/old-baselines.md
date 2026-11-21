---
title: Alten Baselines ihr Layout geben
description: Fügen Sie Baselines, die vor der Layout-Aufzeichnung gespeichert wurden, das Seitenlayout hinzu, damit fehlgeschlagene Vergleiche sagen können, was sich verschoben hat.
order: 4
reviewed: false
---

# Alten Baselines ihr Layout geben

Ihre alten Baselines funktionieren weiter. Neue und ersetzte Baselines halten zusätzlich das Layout der Seite fest, damit ein fehlgeschlagener Vergleich sagen kann, was sich verschoben hat, statt nur geänderte Bereiche aufzulisten. So sehen Sie, welchen Baselines es noch fehlt:

```bash
npx pixsame baselines
```

Lassen Sie dann die CLI Ihre Tests einmal laufen, damit der Runner sie ersetzt. Starten Sie sie im Verzeichnis mit Ihrer `cypress.config.*` oder `playwright.config.*`; sie zeigt den Befehl, fragt vor dem Start nach und fragt nach allem, was sie nicht selbst findet (etwa dem Verzeichnis der Konfiguration):

```bash
npx pixsame baselines --update
```

Dabei wird jede Baseline in diesem Lauf ersetzt, wie bei `pluginVisualRegressionUpdateImages=true`. Mit `--failures-only` werden nur die fehlschlagenden ersetzt. Committen Sie das Ergebnis.
