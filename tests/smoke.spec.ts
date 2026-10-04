import { expect, test } from '@playwright/test';

const widths = [320, 375, 390, 430, 768, 1024, 1440];

for (const width of widths) {
  test(`strona główna nie przewija się poziomo przy ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Duże rozwiązania dla małych firm' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(await page.locator('.hero-visual img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    if (width === 390 || width === 1440) {
      await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
      await page.screenshot({ path: testInfo.outputPath(`hero-${width}.png`) });
      await page.locator('.about-section').screenshot({ path: testInfo.outputPath(`about-${width}.png`) });
    }
  });
}

test('kafelki usług, wdrożenia i dawne adresy prowadzą do właściwych stron', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.service-card')).toHaveCount(4);
  await expect(page.locator('.service-card .text-link')).toHaveCount(4);
  await expect(page.locator('.service-card .text-link')).toHaveText(Array(4).fill('Dowiedz się więcej'));
  await expect(page.locator('.service-card .text-link').nth(0)).toHaveAttribute('href', '/uslugi/automatyzacja/');
  await expect(page.locator('.service-card .text-link').nth(1)).toHaveAttribute('href', '/uslugi/aplikacje-na-miare/');
  await expect(page.locator('.service-card .text-link').nth(2)).toHaveAttribute('href', '/uslugi/ai/');
  await expect(page.locator('.service-card .text-link').nth(3)).toHaveAttribute('href', '/uslugi/strony-internetowe/');
  await expect(page.locator('.website-cases')).toHaveCount(0);
  await expect(page.getByText('Musiał i Wspólnicy', { exact: true })).toHaveCount(0);
  await expect(page.locator('a[href*="/przyklady/"]')).toHaveCount(0);
  await expect(page.locator('a[href*="/zastosowania/"]')).toHaveCount(0);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/uslugi/strony-internetowe/');
  await expect(page.getByRole('heading', { name: 'Strony internetowe', level: 1 })).toBeVisible();
  await expect(page.locator('.process-step')).toHaveCount(3);
  await expect(page.locator('.process-step h3')).toHaveText(['Rozmowa', 'Projekt', 'Wdrożenie']);
  const examplesGrid = page.locator('.website-cases .story-grid');
  await expect(page.locator('.website-cases .story-card')).toHaveCount(2);
  expect(await examplesGrid.evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)).toBe(2);
  for (const image of await page.locator('.website-cases .story-image img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('website-service-1440.png'), fullPage: true, animations: 'disabled' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/uslugi/strony-internetowe/');
  expect(await examplesGrid.evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)).toBe(1);
  await expect(page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).resolves.toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('website-service-390.png'), fullPage: true, animations: 'disabled' });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/uslugi/strony-internetowe/');
  await page.locator('.website-cases .story-card').first().click();
  await expect(page.getByRole('heading', { name: 'Musiał i Wspólnicy' })).toBeVisible();
  await expect(page.locator('.live-site-link')).toHaveAttribute('href', 'https://www.musial.pl/');
  await expect(page.locator('.live-site-link')).toHaveAttribute('target', '_blank');
  await page.screenshot({ path: testInfo.outputPath('website-case-1440.png'), fullPage: true, animations: 'disabled' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.site-nav')).toBeHidden();
  await expect(page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).resolves.toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('detail-390.png'), fullPage: true, animations: 'disabled' });

  await page.goto('/uslugi/strony-internetowe/prawnik-dla-rolnika/');
  await expect(page.getByRole('heading', { name: 'Prawnik dla Rolnika' })).toBeVisible();
  await expect(page.locator('.live-site-link')).toHaveAttribute('href', 'https://www.prawnikdlarolnika.pl/');

  for (const [slug, title] of [['automatyzacja', 'Automatyzacja'], ['aplikacje-na-miare', 'Aplikacje na miarę'], ['ai', 'AI']] as const) {
    await page.goto(`/uslugi/${slug}/`);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Treść w przygotowaniu' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Porozmawiajmy o projekcie' })).toHaveAttribute('href', '/#kontakt');
  }

  await page.goto('/realizacje/');
  await page.waitForURL('**/uslugi/strony-internetowe/#wdrozenia');
  await expect(page.getByRole('heading', { name: 'Strony stworzone dla prawdziwych firm' })).toBeVisible();
  await page.goto('/wiedza/');
  await expect(page.getByRole('heading', { name: 'Artykuły w przygotowaniu' })).toBeVisible();
});

test('menu mobilne zamyka się Escape i przywraca przewijanie', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('[data-menu-toggle]');
  await expect(toggle).toHaveAccessibleName('Otwórz menu');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('body')).toHaveClass(/menu-open/);
  await expect(page.getByRole('navigation', { name: 'Menu główne' }).getByRole('link', { name: 'Strony internetowe', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Menu główne' }).getByRole('link', { name: 'Pomysły', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  await expect(toggle).toBeFocused();
});

test('formularz waliduje i jasno informuje o braku wysyłki', async ({ page }) => {
  await page.goto('/');
  const form = page.locator('[data-contact-form]');
  await form.getByRole('button', { name: 'Sprawdź formularz' }).click();
  await expect(form.locator('#name')).toHaveAttribute('aria-invalid', 'true');
  await form.locator('#name').fill('Anna');
  await form.locator('#email').fill('anna@example.com');
  await form.locator('#message').fill('Chcę omówić pomysł na aplikację.');
  await form.getByRole('button', { name: 'Sprawdź formularz' }).click();
  await expect(form.getByRole('status')).toContainText('wiadomość nie została wysłana');
});
