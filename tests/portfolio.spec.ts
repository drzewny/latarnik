import { expect, test, type Locator } from '@playwright/test';

async function expectContainedLogo(media: Locator) {
  const image = media.getByRole('img', { name: 'Logo kancelarii Musiał i Wspólnicy', exact: true });
  await expect(image).toHaveAttribute('src', '/assets/portfolio/musial-i-wspolnicy-logo.png');
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(180);
  const imageBox = await image.boundingBox();
  const mediaBox = await media.boundingBox();
  expect(imageBox).not.toBeNull();
  expect(mediaBox).not.toBeNull();
  expect(imageBox!.width).toBeGreaterThan(0);
  expect(imageBox!.height).toBeGreaterThan(0);
  expect(imageBox!.width).toBeLessThanOrEqual(180);
  expect(imageBox!.height).toBeLessThanOrEqual(180);
  expect(imageBox!.x).toBeGreaterThanOrEqual(mediaBox!.x);
  expect(imageBox!.y).toBeGreaterThanOrEqual(mediaBox!.y);
  expect(imageBox!.x + imageBox!.width).toBeLessThanOrEqual(mediaBox!.x + mediaBox!.width);
  expect(imageBox!.y + imageBox!.height).toBeLessThanOrEqual(mediaBox!.y + mediaBox!.height);
  expect(Math.abs(imageBox!.x + imageBox!.width / 2 - mediaBox!.x - mediaBox!.width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(imageBox!.y + imageBox!.height / 2 - mediaBox!.y - mediaBox!.height / 2)).toBeLessThanOrEqual(1);
  await expect(image).toHaveCSS('object-fit', 'contain');
}

for (const [service, category, label, count] of [
  ['Strony internetowe', 'website', 'Strony internetowe', 3],
  ['Aplikacje na miarę', 'web-app', 'Aplikacje', 2],
  ['Automatyzacja', 'automation', 'Automatyzacje', 1],
  ['Integracje AI', 'integration', 'Integracje', 1],
] as const) {
  test(`kafelek ${service} wybiera właściwy filtr portfolio`, async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.service-card').filter({ has: page.getByRole('heading', { name: service, exact: true }) });
    await card.getByRole('link', { name: 'Dowiedz się więcej' }).click();
    await expect(page).toHaveURL(new RegExp(`/portfolio/\\?category=${category}#projekty$`));
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.pf-card:visible')).toHaveCount(count);
    await expect(page.locator('[data-portfolio-empty]')).toBeVisible({ visible: count === 0 });
    await page.reload();
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
}

test('filtry i historia zachowują wybór oraz komunikują wyniki', async ({ page }) => {
  await page.goto('/portfolio/');
  const all = page.getByRole('button', { name: 'Wszystkie', exact: true });
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pf-card h3')).toHaveText([
    'Musiał i Wspólnicy', 'Prawnik dla Rolnika',
    'Wiem i Powiem', 'Wiem i Powiem — aplikacja dla sygnalistów',
    'Musiał i Wspólnicy — aplikacja wewnętrzna',
    'Latarnik — automatyzacja wsparcia użytkowników', 'Latarnik — baza wiedzy RAG i AI',
  ]);
  await page.getByRole('button', { name: 'Automatyzacje', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Automatyzacje. Liczba projektów: 1.');
  await expect(page.locator('.pf-card:visible h3')).toHaveText(['Latarnik — automatyzacja wsparcia użytkowników']);
  await expect(page.locator('[data-portfolio-empty]')).toBeHidden();
  await page.getByRole('button', { name: 'Strony internetowe', exact: true }).click();
  await expect(page.locator('.pf-card:visible')).toHaveCount(3);
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Automatyzacje', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goForward();
  await expect(page.getByRole('button', { name: 'Strony internetowe', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Aplikacje', exact: true }).click();
  await expect(page.locator('.pf-card:visible h3')).toHaveText([
    'Wiem i Powiem — aplikacja dla sygnalistów', 'Musiał i Wspólnicy — aplikacja wewnętrzna',
  ]);
  await expect(page.getByRole('status')).toHaveText('Aplikacje. Liczba projektów: 2.');
  await page.getByRole('button', { name: 'Integracje', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Integracje. Liczba projektów: 1.');
  await expect(page.locator('.pf-card:visible h3')).toHaveText(['Latarnik — baza wiedzy RAG i AI']);
  await all.click();
  await expect(page).toHaveURL(/\/portfolio\/$/);
  await expect(all).toBeFocused();
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(1);
  await expect(page.locator('.pf-card:visible')).toHaveCount(7);
  await page.goto('/portfolio/?category=nieznana');
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pf-card:visible')).toHaveCount(7);
});

for (const project of [
  {
    title: 'Wiem i Powiem',
    path: '/uslugi/strony-internetowe/wiem-i-powiem/',
    parent: '/portfolio/?category=website#projekty',
    headings: [],
    image: '/assets/portfolio/wiem-i-powiem.webp',
    imageAlt: 'Zrzut strony głównej Wiem i Powiem z ofertą obsługi zgłoszeń sygnalistów.',
  },
  {
    title: 'Wiem i Powiem — aplikacja dla sygnalistów',
    path: '/portfolio/wiem-i-powiem-aplikacja/',
    parent: '/portfolio/?category=web-app#projekty',
    headings: [],
    image: '/assets/portfolio/wiem-i-powiem-logo.png',
    imageAlt: 'Logo Wiem i Powiem',
  },
]) {
  test(`osobny wpis ${project.title} ma opis, ilustrację i właściwą nawigację`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/portfolio/');
    await page.getByRole('link', { name: `Zobacz projekt: ${project.title}`, exact: true }).click();
    await expect(page).toHaveURL(project.path);
    await expect(page.getByRole('heading', { name: project.title, level: 1, exact: true })).toBeVisible();
    await expect(page.locator('.detail-content h2')).toHaveText(project.headings);
    if (project.path.startsWith('/portfolio/')) {
      await expect(page.locator('.detail-content')).toContainText('Zgłoszenie z formularza trafia bezpośrednio do systemu');
    }
    await expect(page.locator('.live-site-link')).toHaveAttribute('href', 'https://www.wiemipowiem.pl/');
    await expect(page.locator('.live-site-link')).toHaveAttribute('target', '_blank');
    await expect(page.locator('.live-site-link')).toHaveAttribute('rel', 'noopener noreferrer');
    const image = page.locator('.detail-cover img');
    await expect(image).toHaveAttribute('src', project.image);
    await expect(image).toHaveAttribute('alt', project.imageAlt);
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('.back-link')).toHaveAttribute('href', project.parent);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: testInfo.outputPath(`wiem-i-powiem-${width}.png`), fullPage: true, animations: 'disabled' });
    }
    await page.locator('.back-link').click();
    await expect(page).toHaveURL(project.parent);
    if (project.path.startsWith('/portfolio/')) {
      await expect(page.getByRole('button', { name: 'Aplikacje', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.pf-card:visible')).toHaveCount(2);
    } else {
      await expect(page.getByRole('button', { name: 'Strony internetowe', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.pf-card:visible')).toHaveCount(3);
    }
    await page.goto(project.path);
    await expect(page.getByRole('heading', { name: project.title, level: 1, exact: true })).toBeVisible();
  });
}

for (const width of [320, 390, 768, 1440]) {
  test(`aplikacja wewnętrzna kancelarii ma opis, logo i nawigację przy ${width}px`, async ({ page }, testInfo) => {
    const title = 'Musiał i Wspólnicy — aplikacja wewnętrzna';
    const path = '/portfolio/musial-i-wspolnicy-aplikacja/';
    const parent = '/portfolio/?category=web-app#projekty';
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(parent);
    const card = page.locator('.pf-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await card.scrollIntoViewIfNeeded();
    await expectContainedLogo(card.locator('.pf-card-media--logo'));
    if (width === 390 || width === 1440) {
      await card.screenshot({ path: testInfo.outputPath(`musial-aplikacja-card-${width}.png`), animations: 'disabled' });
    }
    await card.getByRole('link', { name: `Zobacz projekt: ${title}`, exact: true }).click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole('heading', { name: title, level: 1, exact: true })).toBeVisible();
    await expect(page).toHaveTitle(`${title} — latarnik.`);
    await expect(page.locator('.detail-content h2')).toHaveCount(0);
    await expect(page.locator('.detail-content')).toContainText('Klient zgłasza, że niektóre czynności zajmują teraz o 80% mniej czasu');
    await expect(page.locator('.detail-content')).toContainText('Kolejne moduły dodawane są, gdy kancelaria zgłasza nową potrzebę');
    await expect(page.locator('.detail-result')).toHaveCount(0);
    await expect(page.locator('.live-site-link')).toHaveCount(0);
    await expectContainedLogo(page.locator('.detail-cover--logo'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    if (width === 390 || width === 1440) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: testInfo.outputPath(`musial-aplikacja-${width}.png`), fullPage: true, animations: 'disabled' });
    }
    await page.locator('.back-link').click();
    await expect(page).toHaveURL(parent);
    await expect(page.getByRole('button', { name: 'Aplikacje', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.pf-card:visible')).toHaveCount(2);
    await page.goto(path);
    await expect(page.getByRole('heading', { name: title, level: 1, exact: true })).toBeVisible();
  });
}

for (const width of [320, 390, 767, 768, 1023, 1024, 1440]) {
  test(`portfolio ma właściwą siatkę i brak przepełnienia przy ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/portfolio/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page).toHaveTitle('Portfolio — realne projekty, realne efekty | latarnik.');
    await expect(page.locator('.site-header')).toHaveCount(1);
    await expect(page.locator('.site-footer')).toHaveCount(1);
    await expect(page.locator('.brand')).toHaveCount(2);
    if (width === 390) {
      const menu = page.locator('[data-menu-toggle]');
      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('navigation', { name: 'Menu główne' }).getByRole('link', { name: 'Usługi', exact: true })).toHaveAttribute('href', '/#uslugi');
      await page.keyboard.press('Escape');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    }
    await expect(page.locator('.pf-process-step')).toHaveCount(4);
    const columns = await page.locator('.pf-project-grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(width < 768 ? 1 : width < 1024 ? 2 : 3);
    for (const image of await page.locator('main img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    if (width < 768) {
      const filters = page.locator('.pf-filters');
      await page.getByRole('button', { name: 'Integracje', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: 'Integracje', exact: true })).toHaveAttribute('aria-pressed', 'true');
      expect(await filters.evaluate((row) => row.scrollWidth)).toBeGreaterThan(width);
      await page.getByRole('button', { name: 'Wszystkie', exact: true }).click();
      const active = await page.getByRole('button', { name: 'Wszystkie', exact: true }).boundingBox();
      expect(active!.x).toBeGreaterThanOrEqual(0);
      expect(active!.x + active!.width).toBeLessThanOrEqual(width);
      const heroText = await page.locator('.pf-hero-inner').boundingBox();
      const heroImage = await page.locator('.pf-hero-image').boundingBox();
      expect(heroImage!.y).toBeGreaterThanOrEqual(heroText!.y + heroText!.height);
      const contactText = await page.locator('.pf-contact-copy').boundingBox();
      const mark = await page.locator('.pf-mark').boundingBox();
      expect(mark!.y).toBeGreaterThanOrEqual(contactText!.y + contactText!.height);
    }
    if (width === 390 || width === 1440) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: testInfo.outputPath(`portfolio-${width}.png`), fullPage: true, animations: 'disabled' });
    }
  });
}

test('linki projektów i kotwice prowadzą do właściwych miejsc', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/portfolio/');
  await page.getByRole('link', { name: 'Zobacz, jak pracuję' }).click();
  await expect(page).toHaveURL(/#proces$/);
  await page.getByRole('link', { name: 'Porozmawiajmy o Twoim projekcie', exact: true }).click();
  await expect(page).toHaveURL(/#kontakt$/);
  await expect(page.locator('.pf-contact .pf-button')).toHaveAttribute('href', '/#kontakt');
  await page.getByRole('link', { name: 'Zobacz projekt: Musiał i Wspólnicy', exact: true }).click();
  await expect(page).toHaveURL(/\/uslugi\/strony-internetowe\/musial-i-wspolnicy\/$/);
  await expect(page.getByRole('heading', { name: 'Musiał i Wspólnicy', exact: true })).toBeVisible();
});
