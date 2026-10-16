---
title: Manifest-Schema
description: Das runner-unabhängige Lauf-Manifest, das pixsame-Tools lesen und schreiben. Die Spezifikation liegt auf visual-regression.dev.
order: 2
reviewed: false
---

# Manifest-Schema

Das Manifest ist eine JSON-Datei, die jeden Screenshot-Vergleich eines Testlaufs festhält: was verglichen wurde, gegen welche Baseline, und wie es ausgegangen ist. Das Testtool schreibt sie. Alles danach, ein PR-Kommentar-Bot, ein Review-Dashboard, ein Freigabe-Tool, liest die Datei, statt den Runner verstehen zu müssen.

Das Format ist ganz bewusst keine pixsame-Sache. Es ist offen, weder an pixsame noch an einen Runner gebunden, und liegt auf [visual-regression.dev/manifest](https://visual-regression.dev/manifest) im Repository [visual-regression](https://github.com/visual-regression/visual-regression), zusammen mit der Feldreferenz, Konvertern für andere Runner und einem Viewer. Auf npm enthält [`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) das JSON Schema, die Typen sowie Reader, Writer und Merger.

Jedes pixsame-Tool liest und schreibt es. Die GitHub App und die gehostete Plattform werden ein Manifest von jedem Runner annehmen, der eins erzeugt, unserem oder dem von jemand anderem.
