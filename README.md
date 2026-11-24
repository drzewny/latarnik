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

Portret w sekcji „O mnie” jest zdjęciem ilustracyjnym.

## Formularz kontaktowy

Formularz wysyła dane do `/api/kontakt.php` (plik `public/api/kontakt.php`, kopiowany do `dist/api/`). Endpoint ładuje logikę z katalogu `server/`, który na hostingu leży poza katalogiem publicznym. Ochronę przed botami zapewnia [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/), a wysyłkę PHPMailer przez SMTP. Serwer sprawdza też pola, nagłówek `Origin`, ukryte pole-pułapkę i limit 5 wiadomości na 15 minut z jednego IP.

Układ na hostingu:

```
latarnik/
├── server/        ← zawartość server/ z repozytorium (z vendor/ i config.php)
└── public_html/   ← zawartość dist/
```

Wdrożenie (hosting OVH, SFTP) odbywa się ręcznie uruchamianymi workflowami GitHub Actions (zakładka Actions → wybierz workflow → Run workflow). Oba zawsze wdrażają branch `main`:

- **Deploy to prod on demand** (`.github/workflows/deploy-prod.yml`) – `npm ci`, typecheck, build z `TURNSTILE_SITE_KEY` i synchronizacja `dist/` z `<DEPLOY_PATH>/public_html/`. Usuwa z serwera pliki, których nie ma w buildzie (poza `.well-known/`, `.htaccess`, `.ovhconfig`).
- **Deploy backend to prod on demand** (`.github/workflows/deploy-backend-prod.yml`) – `composer install --no-dev`, wygenerowanie `config.php` z sekretów (`.github/scripts/render-config.php`) i synchronizacja `server/` z `<DEPLOY_PATH>/server/`. Katalog `storage/` na serwerze nie jest nadpisywany. Uruchom go przy pierwszym wdrożeniu, po zmianie kodu w `server/` i po zmianie sekretów SMTP/Turnstile.

Konfiguracja leży w środowisku GitHub `Production` (Settings → Environments → Production):

| Rodzaj | Nazwa | Opis |
|---|---|---|
| Secret | `SFTP_PASSWORD` | Hasło użytkownika FTP/SFTP z panelu OVH |
| Secret | `TURNSTILE_SECRET` | Secret key widżetu Turnstile |
| Secret | `SMTP_PASSWORD` | Hasło skrzynki nadawczej |
| Variable | `SFTP_HOST` | np. `ftp.clusterXXX.hosting.ovh.net` |
| Variable | `SFTP_USER` | Login FTP/SFTP |
| Variable | `SFTP_PORT` | Opcjonalnie, domyślnie `22` |
| Variable | `SFTP_KNOWN_HOSTS` | Zalecane: wynik `ssh-keyscan -p 22 <SFTP_HOST>` |
| Variable | `DEPLOY_PATH` | Katalog względem katalogu domowego SFTP, np. `latarnik` |
| Variable | `TURNSTILE_SITE_KEY` | Site key Turnstile (publiczny) |
| Variable | `SMTP_HOST` | np. `ssl0.ovh.net` |
| Variable | `SMTP_USERNAME` | np. `kontakt@latarnik.dev` |
| Variable | `MAIL_TO` | Adres, na który trafiają wiadomości |
| Variable | `SMTP_PORT`, `SMTP_ENCRYPTION` | Opcjonalnie, domyślnie `465` i `ssl` (`587` + `tls` dla STARTTLS) |
| Variable | `MAIL_FROM`, `MAIL_FROM_NAME` | Opcjonalnie, domyślnie `SMTP_USERNAME` i „Formularz latarnik.dev” |
| Variable | `TURNSTILE_HOSTNAMES`, `ALLOWED_ORIGINS` | Opcjonalnie, listy po przecinku; domyślnie `latarnik.dev` i `www.latarnik.dev` |

Wymagania po stronie hostingu: katalog główny domeny (Multisite) ustawiony na `<DEPLOY_PATH>/public_html`, PHP ≥ 8.3 z rozszerzeniami `curl` i `mbstring`. Turnstile: w panelu Cloudflare → Turnstile dodaj widżet dla `latarnik.dev` (tryb Managed).

Wdrożenie ręczne (awaryjnie): `npm run build` z `TURNSTILE_SITE_KEY` w `.env` i wgranie `dist/` do `latarnik/public_html/`; w `server/` `composer install --no-dev`, `config.php` na podstawie `config.example.php` i wgranie całego `server/` (z `vendor/` i `config.php`) do `latarnik/server/`. Katalog `latarnik/server/storage/` musi być zapisywalny przez PHP (limit wysyłek).

Błędy (SMTP, Turnstile) trafiają do logu PHP z prefiksem `[kontakt]`; użytkownik widzi tylko ogólny komunikat.

Lokalnie: utwórz `server/config.php` z testowym sekretem `1x0000000000000000000000000000000AA`, pustymi `turnstile_hostnames`, `allowed_origins` ustawionym na `['http://127.0.0.1:5173']` i SMTP bez szyfrowania (`'encryption' => 'none'`, np. Mailpit na porcie 1025). Potem uruchom w dwóch terminalach `npm run dev` i `npm run dev:php`. Vite przekazuje `/api` do serwera PHP na porcie 8000.

## Kontrola jakości

```bash
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Testy sprawdzają szerokości 320–1440 px, trasy, stan pustych kolekcji, menu mobilne, formularz (z zaślepką Turnstile i endpointu) oraz publikowanie wpisów CMS. Favicony (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, ikony 192/512 i `site.webmanifest` w `public/`) odtwarza znak „l.” z sekcji kontaktu; po zmianie nazwy lub kolorów przebuduj je poleceniem `npm run favicons`. Lokalna czcionka Inter jest objęta licencją SIL OFL dołączoną w `public/fonts/OFL.txt`.

## Wersje językowe

Polski pozostaje pod obecnymi adresami, a pełna wersja angielska pod `/en/`. Język wynika z adresu: nie ma przekierowań według IP, przeglądarki ani zapisanej preferencji. Przełącznik PL/EN znajduje się w menu stopki i zachowuje podstronę, parametry i kotwicę. Na polskich stronach główny język przeglądarki inny niż polski powoduje pokazanie propozycji wersji angielskiej.

Adresy stron bez końcowego ukośnika (np. `/en`) są przez serwery Vite dev i preview przekierowywane na odpowiednik z ukośnikiem (`/en/`), z zachowaniem parametrów i kotwicy. Dzięki temu oba zapisy otwierają tę samą wersję językową. Nieistniejące strony zwracają 404 zamiast polskiej strony głównej.

Wyłącznie kliknięcie wyboru Polski/English zapisuje `localStorage['latarnik-language']` jako `pl` albo `en`. Zapis wyłącza kolejne podpowiedzi, pozostaje do usunięcia przez użytkownika i nie jest przekazywany do analityki ani serwera. Samo zamknięcie podpowiedzi niczego nie zapisuje. Mechanizm języków nie korzysta z cookies. Bez JavaScript lub przy zablokowanym zapisie nadal działają zwykłe odnośniki między wersjami.

Polskie treści są w dotychczasowych plikach `content/`, a angielskie tłumaczenia w `content/en/`. W Pages CMS angielskie pozycje mają oznaczenie `(EN)`. Tłumaczenia zawierają tylko teksty; obrazy, ikony, adresy, dane kontaktowe, datę polityki, kolejność i stan publikacji pobieramy z PL. Slugi usług są stałymi identyfikatorami wspólnymi dla obu języków. Po zmianie kolejności usług tłumaczenia są nadal dopasowywane według sluga. Pozostałe listy (np. sekcje opisów) muszą mieć zgodną strukturę i kolejność.

Nowy projekt wymaga tłumaczenia w `content/en/cases/` **o identycznej nazwie pliku jak polski projekt**. Podczas tworzenia tłumaczenia w CMS wpisz tę nazwę w polu nazwy pliku, zamiast pozostawiać nazwę utworzoną z angielskiego tytułu. Przed publikacją uzupełnij oba języki. Brak pliku, pusty wymagany tekst lub różna liczba sekcji zatrzymuje build z informacją o brakującym tłumaczeniu. Szkice i wyłączone artykuły nie wymagają tłumaczenia. Testy generatora używają kopii treści w katalogach tymczasowych.

Formularz wysyła dodatkowo `language=pl|en`; brak lub inna wartość oznacza polski. Format odpowiedzi JSON pozostaje ten sam. Przy wdrażaniu tej zmiany uruchom najpierw workflow backendu, a następnie workflow witryny. Nowy backend obsługuje również dotychczasowy formularz bez pola języka.
