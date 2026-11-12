---
title: Schemat manifestu
description: Niezależny od runnera manifest uruchomienia, który czytają i zapisują narzędzia pixsame. Specyfikacja jest na visual-regression.dev.
order: 2
reviewed: false
---

# Schemat manifestu

Manifest to plik JSON z zapisem każdego porównania zrzutów ekranu, jakie wykonało uruchomienie testów: co porównano, z którym baseline'em i jak poszło. Zapisuje go narzędzie testowe. Wszystko dalej, bot komentujący PR-y, dashboard do review, narzędzie do akceptacji, czyta ten plik zamiast rozumieć runner.

Format celowo nie jest „rzeczą pixsame”. Jest otwarty, niezwiązany ani z pixsame, ani z żadnym runnerem, i mieszka na [visual-regression.dev/manifest](https://visual-regression.dev/manifest) w repozytorium [visual-regression](https://github.com/visual-regression/visual-regression), razem z opisem pól, konwerterami dla innych runnerów i viewerem. W npm [`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) zawiera JSON Schema, typy oraz reader, writer i merger.

Każde narzędzie pixsame go czyta i zapisuje. GitHub App i platforma hostowana przyjmą manifest z każdego runnera, który go wyprodukuje, naszego albo czyjegoś.
