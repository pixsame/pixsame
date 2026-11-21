---
title: Nadaj starym baseline'om layout
description: Dodaj layout strony do baseline'ów zapisanych, zanim pixsame go rejestrował, żeby nieudane porównania mogły powiedzieć, co się przesunęło.
order: 4
reviewed: false
---

# Nadaj starym baseline'om layout

Twoje stare baseline'y nadal działają. Nowe i zastąpione baseline'y zapisują też layout strony, dzięki czemu nieudane porównanie może powiedzieć, co się przesunęło, zamiast tylko wypisywać zmienione obszary. Sprawdź, którym baseline'om go jeszcze brakuje:

```bash
npx pixsame baselines
```

Potem pozwól CLI uruchomić testy raz, żeby runner zastąpił baseline'y. Uruchom je w katalogu z `cypress.config.*` lub `playwright.config.*`; pokaże komendę, zapyta przed uruchomieniem i dopyta o to, czego sam nie znajdzie (np. katalog z konfiguracją):

```bash
npx pixsame baselines --update
```

Zastępuje to wszystkie baseline'y w tym przebiegu, tak jak `pluginVisualRegressionUpdateImages=true`. Dodaj `--failures-only`, żeby zastąpić tylko te, które nie przechodzą. Zatwierdź wynik.
