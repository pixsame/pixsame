---
title: Użycie
description: Skonfiguruj matchImage i utrzymuj porządek w baseline'ach.
order: 2
reviewed: false
---

# Użycie

Plugin dodaje jedną komendę, `matchImage`. To całe API po stronie testów.

## Porównaj element albo całą stronę

```ts
cy.get('.an-element-of-your-choice').matchImage();

// albo cały dokument
cy.matchImage();
```

## Skonfiguruj porównanie

Opcje podajesz per wywołanie. Pełna lista, razem z wartościami domyślnymi, jest na stronie [Konfiguracja](/docs/reference/configuration). Po te sięga się najczęściej:

```ts
cy.matchImage({
  // przekazywane do API zrzutów ekranu Cypress
  screenshotConfig: { blackout: ['.element-to-be-blackouted'] },
  // opcje pixelmatch
  diffConfig: { threshold: 0.01 },
  // twórz baseline'y, które jeszcze nie istnieją (domyślnie: true)
  createMissingImages: false,
  // nadpisuj baseline'y: true | 'failures-only' | false (domyślnie: false)
  updateImages: false,
});
```

## Usuń nieużywane obrazy

Baseline'y się zbierają, gdy testy zmieniają nazwy albo znikają. To uruchomienie usuwa każdy obraz pluginu, którego nie dotknął żaden test:

```bash
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
```

Odpal wtedy cały zestaw testów. Jeśli ograniczysz się do kilku speców, baseline'y pominiętych speców też policzą się jako nieużywane.

W Cypress starszym niż 15.10 nie ma jeszcze `--expose`. Przekaż ten sam klucz przez `--env`.

## Więcej

Cała reszta jest na stronie [Konfiguracja](/docs/reference/configuration). Jeśli coś jest niejasne albo masz pomysł, [dyskusje na GitHubie](https://github.com/pixsame/pixsame/discussions) to miejsce, gdzie o tym rozmawiamy.
