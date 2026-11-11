import { test, expect } from '@playwright/test';

const email = process.env.QA_LOGIN_EMAIL;
const password = process.env.QA_LOGIN_PASSWORD;
const configured = Boolean(email && password);

test('QA: login real, exercício, copiar e guardar progresso', async ({ page, context }) => {
  test.skip(!configured, 'QA_LOGIN_EMAIL and QA_LOGIN_PASSWORD are required');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.locator('input[type="email"]').fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20000 });
  await page.goto('/learn/anatomia-prompt');
  await expect(page.getByTestId('lesson')).toHaveAttribute('data-locked', '0');
  const filler = page.getByTestId('template-filler');
  await expect(filler).toBeVisible();
  const inputs = filler.locator('input,textarea');
  await expect(inputs.first()).toBeVisible();
  await inputs.first().fill('QA Playwright');
  await expect(filler.getByTestId('template-text')).toContainText('QA Playwright');
  await filler.getByRole('button', { name: /^(copiar|copy)$/i }).click();
  await expect(page.getByText(/^(copiado!|copied!)$/i).first()).toBeVisible();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain('QA Playwright');
  const complete = page.getByTestId('lesson-complete');
  const originallyDone = await complete.getAttribute('data-done');
  await complete.click();
  await expect(complete).toHaveAttribute('data-done', originallyDone === '1' ? '0' : '1');
  await page.reload();
  await expect(page.getByTestId('lesson-complete')).toHaveAttribute('data-done', originallyDone === '1' ? '0' : '1');
  await page.getByTestId('lesson-complete').click();
  await expect(page.getByTestId('lesson-complete')).toHaveAttribute('data-done', originallyDone!);
});

test('QA: visitante preenche exercício e login é exigido para guardar', async ({ page }) => {
  await page.goto('/learn/anatomia-prompt');
  await expect(page.getByTestId('lesson')).toHaveAttribute('data-locked', '0');
  const filler = page.getByTestId('template-filler');
  await filler.locator('input,textarea').first().fill('Teste visitante');
  await expect(filler.getByTestId('template-text')).toContainText('Teste visitante');
  await page.getByTestId('lesson-complete').click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
});
