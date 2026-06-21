import { test, expect } from '@playwright/test';

test.describe('Sterling Smoke Tests', () => {
  test('landing page loads with correct title and hero content', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Sterling/);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /get started free/i })).toBeVisible();
  });

  test('landing page nav has correct links', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('banner');
    await expect(nav.getByRole('link', { name: /sterling/i }).first()).toBeVisible();
    await expect(nav.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('login page loads with email and password fields', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveTitle(/sterling/i);
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('register page loads with company registration form', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page).toHaveTitle(/sterling/i);
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(page).toHaveTitle(/sterling/i);
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
  });

  test('public invoice page shows not-found for invalid token', async ({ page }) => {
    await page.goto('/invoice/invalid-test-token-00000000');
    await expect(page.getByText(/invoice not found/i).or(page.getByText(/invalid/i)).or(page.getByText(/expired/i))).toBeVisible({ timeout: 10000 });
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-at-all');
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });

  test('features section is present on landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /features/i }).first().click();
    await expect(page.locator('#features')).toBeVisible();
  });

  test('pricing section is present on landing page', async ({ page }) => {
    await page.goto('/');
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await expect(page.locator('#pricing')).toBeVisible();
  });
});
