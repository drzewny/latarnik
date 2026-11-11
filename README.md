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
- `content/home.json` zawiera teksty strony głównej, usługi i korzyści. Każdy kafelek usługi ma stały `slug` powiązany z filtrem portfolio. Podstrony `/uslugi/{slug}/` są generowane dla pozostałych usług; podstrona `/uslugi/strony-internetowe/` została usunięta.
- `content/cases/*.json` zawiera opisy wdrożeń. Wdrożenia stron internetowych zachowują adresy `/uslugi/strony-internetowe/{slug}/`; pozostałe kategorie mają adresy `/portfolio/{slug}/`.
- `content/portfolio.json` zawiera teksty strony `/portfolio/`, grafikę hero, etapy współpracy i końcowe CTA. Znaki nowej linii w nagłówkach wyznaczają podział na desktopie.
- Portfolio korzysta z tej samej kolekcji `content/cases/`. Pole `portfolioCategory` wybiera filtr (`website`, `automation`, `web-app`, `integration`), a opcjonalne `portfolioImage` i `portfolioImageAlt` określają makietę oraz jej opis. Brak makiety oznacza użycie pola `image`; stare wpisy bez kategorii są traktowane jako `website`. Wszystkie opisy wdrożeń odsyłają do odpowiedniego filtra portfolio. Dawny adres `/realizacje/` prowadzi do `/portfolio/?category=website#projekty`. `externalUrl` jest opcjonalny.
- `content/articles/*.json` zawiera artykuły zachowane do późniejszego wykorzystania. Kolekcja „Artykuły” pozostaje edytowalna w Pages CMS, ale generator nie odczytuje ani nie publikuje tych treści, niezależnie od pola `published`. Dział `/wiedza/` i podstrony artykułów są wyłączone.

Każdy wpis kolekcji ma `published`, `order`, `category`, `title`, `summary`, `image` i listę `blocks` z polami `heading` oraz `text`. W kolekcji wdrożeń nazwa pliku tworzy stały adres podstrony; wpisy z `published: false` nie trafiają do wygenerowanej witryny. Obrazy wybieraj z `public/assets/`, zapisując ścieżki jako `/assets/nazwa-pliku.webp` lub `/assets/nazwa-pliku.jpg`.

Konfiguracja CMS znajduje się w `.pages.yml`. Aby edytować treści przez interfejs [Pages CMS](https://pagescms.org/docs/quick-start/), właściciel repozytorium musi połączyć aplikację z GitHubem. Sam Pages CMS zapisuje zmiany w Git; nie publikuje witryny.

Linki „Dowiedz się więcej” na stronie głównej prowadzą do `/portfolio/?category=…#projekty`. Kategorie są przypisane do stałych slugów usług, więc zmiana ich kolejności w CMS nie zmienia działania linków. Wybór filtra zapisuje się w adresie i historii przeglądarki. Nowe grafiki portfolio i prompty opisuje [dokumentacja assetów](docs/portfolio-assets.md).

Formularz na stronie głównej służy do podglądu i walidacji. Nie wysyła ani nie przechowuje wiadomości. Przed publiczną publikacją potrzebne są prawdziwe dane kontaktowe, obsługa wysyłki i potwierdzone materiały o firmie. Portret w sekcji „O mnie” jest zdjęciem ilustracyjnym.

## Kontrola jakości

```bash
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Testy sprawdzają szerokości 320–1440 px, trasy, stan pustych kolekcji, menu mobilne, formularz oraz publikowanie wpisów CMS. Favicony (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, ikony 192/512 i `site.webmanifest` w `public/`) odtwarza znak „l.” z sekcji kontaktu; po zmianie nazwy lub kolorów przebuduj je poleceniem `npm run favicons`. Lokalna czcionka Inter jest objęta licencją SIL OFL dołączoną w `public/fonts/OFL.txt`.
