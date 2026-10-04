# latarnik.

Statyczna strona podglądowa zbudowana w Vite i TypeScript. Treść pochodzi z plików JSON edytowalnych przez Pages CMS.

## Uruchomienie

```bash
npm install
npm run dev
```

Serwer developerski jest dostępny pod `http://127.0.0.1:5173/`. Zmiany w plikach źródłowych Vite odświeża automatycznie, a po zmianie plików JSON w `content/` ponownie generuje strony i odświeża podgląd. `npm run build` zapisuje gotową witrynę w `dist/`. Do jej publikacji potrzebny jest hosting plików statycznych z przebudową po zmianach w repozytorium.

## Treści i CMS

- `content/site.json` zawiera opis strony i opcjonalne dane kontaktowe. Puste pola nie są wyświetlane.
- `content/home.json` zawiera teksty strony głównej, usługi i korzyści. Każdy kafelek usługi ma stały `slug` i własną stronę pod `/uslugi/{slug}/`.
- `content/services/strony-internetowe.json` zawiera etapy współpracy i wstęp do sekcji wdrożeń na stronie `/uslugi/strony-internetowe/`.
- `content/cases/*.json` zawiera opisy wdrożeń pod `/uslugi/strony-internetowe/{slug}/`. Każdy wpis ma `externalUrl` z adresem działającej witryny.
- `content/articles/*.json` zawiera gotowe artykuły.

Każdy wpis kolekcji ma `published`, `order`, `category`, `title`, `summary`, `image` i listę `blocks` z polami `heading` oraz `text`. Nazwa pliku tworzy stały adres podstrony; wpisy z `published: false` nie trafiają do wygenerowanej witryny. Obrazy wybieraj z `public/assets/`, zapisując ścieżki jako `/assets/nazwa-pliku.webp` lub `/assets/nazwa-pliku.jpg`.

Konfiguracja CMS znajduje się w `.pages.yml`. Aby edytować treści przez interfejs [Pages CMS](https://pagescms.org/docs/quick-start/), właściciel repozytorium musi połączyć aplikację z GitHubem. Sam Pages CMS zapisuje zmiany w Git; nie publikuje witryny.

Formularz na stronie głównej służy do podglądu i walidacji. Nie wysyła ani nie przechowuje wiadomości. Przed publiczną publikacją potrzebne są prawdziwe dane kontaktowe, obsługa wysyłki i potwierdzone materiały o firmie. Portret w sekcji „O mnie” jest zdjęciem ilustracyjnym.

## Kontrola jakości

```bash
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Testy sprawdzają szerokości 320–1440 px, trasy, stan pustych kolekcji, menu mobilne, formularz oraz publikowanie wpisów CMS. Lokalna czcionka Inter jest objęta licencją SIL OFL dołączoną w `public/fonts/OFL.txt`.
