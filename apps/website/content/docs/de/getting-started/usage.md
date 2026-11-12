---
title: Verwendung
description: Konfigurieren Sie matchImage und halten Sie Ihre Baselines aufgeräumt.
order: 2
reviewed: false
---

# Verwendung

Das Plugin fügt einen einzigen Command hinzu: `matchImage`. Das ist auf der Testseite die ganze API.

## Ein Element oder die Seite vergleichen

```ts
cy.get('.an-element-of-your-choice').matchImage();

// oder das gesamte Dokument
cy.matchImage();
```

## Einen Vergleich konfigurieren

Optionen werden pro Aufruf übergeben. Die vollständige Liste samt Standardwerten steht auf der Seite [Konfiguration](/docs/reference/configuration). Das hier sind die, nach denen man zuerst greift:

```ts
cy.matchImage({
  // wird an die Screenshot-API von Cypress weitergereicht
  screenshotConfig: { blackout: ['.element-to-be-blackouted'] },
  // pixelmatch-Optionen
  diffConfig: { threshold: 0.01 },
  // noch nicht vorhandene Baselines anlegen (Standard: true)
  createMissingImages: false,
  // Baselines überschreiben: true | 'failures-only' | false (Standard: false)
  updateImages: false,
});
```

## Ungenutzte Bilder aufräumen

Baselines sammeln sich an, wenn Tests umbenannt oder gelöscht werden. Dieser Lauf entfernt jedes Plugin-Bild, das kein Test angefasst hat:

```bash
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
```

Lassen Sie dabei die komplette Suite laufen. Filtern Sie auf ein paar Specs, zählen die Baselines der übersprungenen Specs ebenfalls als ungenutzt.

Bei Cypress-Versionen vor 15.10 gibt es `--expose` noch nicht. Übergeben Sie denselben Schlüssel stattdessen über `--env`.

## Mehr

Alles Weitere steht auf der Seite [Konfiguration](/docs/reference/configuration). Wenn etwas unklar ist oder Sie eine Idee haben: In den [GitHub Discussions](https://github.com/pixsame/pixsame/discussions) reden wir darüber.
