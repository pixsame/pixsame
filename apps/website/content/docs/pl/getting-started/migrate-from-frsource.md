---
title: Migracja z @frsource
description: Przejdź z @frsource/cypress-plugin-visual-regression-diff na @pixsame/cypress-plugin-visual-regression-diff w jednym kroku.
order: 3
reviewed: false
---

# Migracja z @frsource

## Dlaczego pakiet się przeniósł

Plugin zaczynał jako `@frsource/cypress-plugin-visual-regression-diff`. Teraz jest w organizacji [pixsame](https://github.com/pixsame), obok formatu manifestu i pozostałych narzędzi, i publikujemy go jako `@pixsame/cypress-plugin-visual-regression-diff`. Stara nazwa jest zamrożona. Nie pójdą tam już żadne wydania, więc poprawki trafią do ciebie dopiero, gdy się przesiądziesz.

## Co się właściwie zmienia

Nazwa. `@pixsame` 1.0.0 to dokładnie ten sam kod co `@frsource` 4.3.0, tylko z inną etykietą na pudełku. Obrazy baseline, konfiguracja, każda komenda `cy.*`: wszystko nietknięte.

## Użyj komendy migrate

Ostatnie wydania `@frsource` zawierają komendę, która zrobi zmianę nazwy za ciebie. Przechodzi przez każdy `package.json` poniżej bieżącego katalogu i podmienia zależność, przepisuje importy i odwołania do typów w plikach konfiguracji i support, a potem instaluje ponownie tym menedżerem pakietów, który znajdzie:

```bash
npx @frsource/cypress-plugin-visual-regression-diff migrate
```

Zanim cokolwiek zapisze, wypisuje pliki, które zamierza ruszyć, i czeka na twoje „tak”.

| Flaga          | Co robi                                         |
| -------------- | ----------------------------------------------- |
| `--dry-run`    | Tylko wypisuje pliki, które zostałyby zmienione |
| `--yes`        | Pomija pytanie o zgodę (wymagane w CI)          |
| `--no-install` | Pomija krok instalacji                          |

## Wolisz zrobić to ręcznie?

Dwa kroki. Podmień pakiet, a potem znajdź i zamień nazwę w importach:

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

Miejsce, które łatwo przeoczyć: jeśli pakiet jest wpisany w `compilerOptions.types` w `tsconfig.json`, zmień nazwę również tam, bo inaczej `tsc` poskarży się na definicję typów, której nie może znaleźć.
