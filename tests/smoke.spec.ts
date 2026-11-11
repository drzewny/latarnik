import { expect, test } from '@playwright/test';

const widths = [320, 375, 390, 430, 768, 1024, 1440];

for (const width of widths) {
  test(`strona główna nie przewija się poziomo przy ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Duże rozwiązania dla małych firm' })).toBeVisible();
    await expect(page.locator('a[href*="/wiedza"], a[href="#wiedza"]')).toHaveCount(0);
    await expect(page.locator('#wiedza, .knowledge-section')).toHaveCount(0);
    await expect(page.locator('.benefits-section + .contact-section')).toHaveCount(1);
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
  await expect(page.locator('.service-card .text-link').nth(0)).toHaveAttribute('href', '/portfolio/?category=website#projekty');
  await expect(page.locator('.service-card .text-link').nth(1)).toHaveAttribute('href', '/portfolio/?category=web-app#projekty');
  await expect(page.locator('.service-card .text-link').nth(2)).toHaveAttribute('href', '/portfolio/?category=automation#projekty');
  await expect(page.locator('.service-card .text-link').nth(3)).toHaveAttribute('href', '/portfolio/?category=integration#projekty');
  await expect(page.locator('.website-cases')).toHaveCount(0);
  await expect(page.getByText('Musiał i Wspólnicy', { exact: true })).toHaveCount(0);
  await expect(page.locator('a[href*="/przyklady/"]')).toHaveCount(0);
  await expect(page.locator('a[href*="/zastosowania/"]')).toHaveCount(0);
  await expect(page.locator('a[href="/uslugi/strony-internetowe/"]')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Menu w stopce' }).getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '/portfolio/');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/portfolio/?category=website#projekty');
  await expect(page.getByRole('button', { name: 'Strony internetowe', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pf-card:visible h3')).toHaveText([
    'Musiał i Wspólnicy', 'Prawnik dla Rolnika', 'Wiem i Powiem — strona internetowa',
  ]);
  await page.getByRole('link', { name: 'Zobacz projekt: Musiał i Wspólnicy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Musiał i Wspólnicy' })).toBeVisible();
  await expect(page.locator('.live-site-link')).toHaveAttribute('href', 'https://www.musial.pl/');
  await expect(page.locator('.live-site-link')).toHaveAttribute('target', '_blank');
  await expect(page.locator('.back-link')).toHaveAttribute('href', '/portfolio/?category=website#projekty');
  await page.screenshot({ path: testInfo.outputPath('website-case-1440.png'), fullPage: true, animations: 'disabled' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.site-nav')).toBeHidden();
  await expect(page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).resolves.toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('detail-390.png'), fullPage: true, animations: 'disabled' });

  await page.goto('/uslugi/strony-internetowe/prawnik-dla-rolnika/');
  await expect(page.getByRole('heading', { name: 'Prawnik dla Rolnika' })).toBeVisible();
  await expect(page.locator('.live-site-link')).toHaveAttribute('href', 'https://www.prawnikdlarolnika.pl/');

  for (const [slug, title] of [['automatyzacja', 'Automatyzacja'], ['aplikacje-na-miare', 'Aplikacje na miarę'], ['ai', 'Integracje AI']] as const) {
    await page.goto(`/uslugi/${slug}/`);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(page.locator('.service-copy section')).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Omówmy potrzeby Twojej firmy' })).toHaveAttribute('href', '/#kontakt');
  }

  await page.goto('/realizacje/');
  await page.waitForURL('**/portfolio/?category=website#projekty');
  await expect(page.getByRole('button', { name: 'Strony internetowe', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pf-card:visible')).toHaveCount(3);
});

test('menu mobilne zamyka się Escape i przywraca przewijanie', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('[data-menu-toggle]');
  await expect(toggle).toHaveAccessibleName('Otwórz menu');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('body')).toHaveClass(/menu-open/);
  await expect(page.getByRole('navigation', { name: 'Menu główne' }).getByRole('link', { name: 'Usługi', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Menu główne' }).getByRole('link', { name: 'Pomysły', exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Menu główne' }).getByRole('link', { name: 'Wiedza', exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('menu-390.png'), animations: 'disabled' });
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
