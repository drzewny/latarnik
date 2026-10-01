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

test('podstrony i puste kolekcje mają działające trasy', async ({ page }) => {
  await page.goto('/zastosowania/');
  await expect(page.locator('.story-card')).toHaveCount(3);
  await page.locator('.story-card').first().click();
  await expect(page.getByText('nie jest realizacją klienta')).toBeVisible();
  await page.goto('/realizacje/');
  await expect(page.getByRole('heading', { name: 'Realizacje w przygotowaniu' })).toBeVisible();
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
  await expect(page.getByRole('navigation', { name: 'Menu główne' }).getByText('Zastosowania')).toBeVisible();
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
