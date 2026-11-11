# Grafiki portfolio

Hero wygenerowano wbudowanym narzędziem `image_gen` 19 października 2026 r. i zakodowano do WebP (`cwebp`, jakość 88). Latarnia jest osobnym, ręcznie napisanym SVG. Karty stron Musiał i Wspólnicy, Prawnik dla Rolnika oraz Wiem i Powiem przedstawiają rzeczywiste zrzuty publicznych stron głównych, bez makiet przeglądarki ani dodatkowych elementów interfejsu.

## Hero

Plik: `public/assets/portfolio/hero-laptop-dashboard.webp`, szerokość 1440 px.

Prompt:

> Use case: product-mockup. Create a photorealistic website hero image matching the attached portfolio reference composition: an ultrathin dark silver laptop seen from a slightly low front-left viewpoint, screen rises toward upper right, sitting behind a white concrete plinth cutting diagonally across the foreground. Laptop on the RIGHT half, cropped by right edge, generous entirely empty near-white area on the LEFT for website copy (do not draw copy). On screen a believable pale white and blue Polish small-business dashboard 'Panel firmy', dark slim sidebar, three KPI cards and blue line chart, subtle tiny UI. White / very pale cool grey studio background blending perfectly to #FFFFFF on the left. Fine concrete texture, soft natural lighting, neutral white color grading. Wide landscape 16:10 composition. The laptop should occupy most of the right half, plinth bottom fifth, blank left half. No text or logos outside the laptop screen, no watermarks, no colorful geometric background, no surrounding objects. This is only the hero asset, not a complete webpage.

## Musiał i Wspólnicy

Plik: `public/assets/portfolio/musial-i-wspolnicy.webp`, 1440 × 1008 px.

Rzeczywisty zrzut strony głównej `https://www.musial.pl/`, wykonany 10 listopada 2026 r. w Chromium (Playwright). Nagłówek TECHNOLOGIA / ŚRODOWISKO / MY. jest animowany, dlatego zrzut wykonano 6 s po załadowaniu strony i fontów, gdy cały napis — łącznie z MY. — jest już na swoim miejscu. Zakodowano do WebP (`cwebp`, jakość 88).

## Prawnik dla Rolnika

Plik: `public/assets/portfolio/prawnik-dla-rolnika.webp`, 1440 × 1008 px.

Rzeczywisty zrzut strony głównej `https://www.prawnikdlarolnika.pl/`, wykonany 10 listopada 2026 r. w Chromium (Playwright) po załadowaniu fontów i zakończeniu animacji wejścia. Zakodowano do WebP (`cwebp`, jakość 88).

## Wiem i Powiem

Plik: `public/assets/portfolio/wiem-i-powiem.webp`, 1440 × 1008 px.

Rzeczywisty zrzut strony głównej `https://www.wiemipowiem.pl/`, wykonany 19 października 2026 r. w Chromium (Playwright). Zapisano widok początkowy po załadowaniu fontów i ilustracji, przy wyłączonych animacjach, a następnie zakodowano do WebP (`cwebp`, jakość 88).

Plik ilustruje kartę oraz podstronę realizacji witryny.

## Wiem i Powiem — aplikacja dla sygnalistów

Plik: `public/assets/portfolio/wiem-i-powiem-logo.png`, 330 × 150 px, z przezroczystym tłem.

Oryginalne logo poziome pobrane bez zmian ze strony `https://www.wiemipowiem.pl/img/logo/WiP-LOGO-POZIOM-1.png` (wariant używany w jasnym nagłówku witryny). Wpis ma `imagePresentation: logo`, tak jak aplikacja Musiał i Wspólnicy.

## Musiał i Wspólnicy — aplikacja wewnętrzna

Plik: `public/assets/portfolio/musial-i-wspolnicy-logo.png`, 180 × 180 px, z przezroczystym tłem.

Logo dostarczone przez użytkownika, skopiowane bez zmian z `apple-touch-icon-light.png`. Na karcie portfolio i podstronie realizacji jest wyśrodkowane na jasnym tle, bez powiększania ponad oryginalny rozmiar. Pole `imagePresentation` ma wartość `logo`; domyślny wariant pozostałych ilustracji to `cover`.
