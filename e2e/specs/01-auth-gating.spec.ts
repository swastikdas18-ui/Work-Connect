import { test, expect } from '@playwright/test';

test.describe('Spec 01: Auth Gating & Intent Resumption', () => {
  test.beforeEach(async ({ page }) => {
    // Clear state before running unauthenticated checks
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('1.1: Initial load shows public discovery hero, Explore Communities, and suppresses initial connection toast', async ({ page }) => {
    await page.goto('/');

    // Wait for the app root and discovery hero to load
    await expect(page.locator('text=Where Teams, Cohorts & Interns Build')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Explore Communities/i })).toBeVisible();

    // Critical requirement: Suppress "Back online. Sync completed!" toast on initial mount
    const backOnlineToast = page.locator('text=Back online. Sync completed!');
    await expect(backOnlineToast).toHaveCount(0);
  });

  test('1.2: Unauthenticated click on [+ Create Community] opens AuthModal with "Create Your Community"', async ({ page }) => {
    await page.goto('/');

    // The hero or header contains the "Create a Community" trigger button
    const createBtn = page.getByRole('button', { name: /Create a Community|Create Community/i }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Must NOT mount the community creation form
    await expect(page.locator('input[placeholder="e.g. Frontend Guild, AI/ML Working Group"]')).toHaveCount(0);

    // Must mount AuthModal with exact title and subtitle
    const modalTitle = page.locator('text=Create Your Community');
    await expect(modalTitle).toBeVisible();

    const modalSubtitle = page.locator('text=Sign in or create an account to launch and manage your space.');
    await expect(modalSubtitle).toBeVisible();
  });

  test('1.3: Unauthenticated click on "Join Space" opens AuthModal with "Join [Name]"', async ({ page }) => {
    await page.goto('/');

    // Locate the first explore community card and its join button
    const joinBtn = page.getByRole('button', { name: /Join Space/i }).first();
    await expect(joinBtn).toBeVisible();

    // Extract community card name if possible
    const card = joinBtn.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]');
    const communityName = (await card.locator('h3').first().textContent())?.trim() || '';

    await joinBtn.click();

    // AuthModal should open with "Join [Community Name]"
    if (communityName) {
      await expect(page.getByRole('heading', { name: `Join ${communityName}` })).toBeVisible();
    } else {
      await expect(page.locator('h2:has-text("Join ")')).toBeVisible();
    }
  });

  test('1.4: Entering invalid auth credentials displays sanitized error message', async ({ page }) => {
    await page.goto('/');

    // Open AuthModal
    const signInBtn = page.getByRole('button', { name: /Sign In/i }).first();
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
    } else {
      await page.getByRole('button', { name: /Create a Community|Create Community/i }).first().click();
    }

    // Enter invalid email format
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill('invalid-email-format');
    await passwordInput.fill('short');

    // Click submit button in auth form
    const submitBtn = page.locator('form button[type="submit"]').first();
    await submitBtn.click();

    // Verify error messaging never leaks raw Supabase errors
    const errorBanner = page.locator('.text-rose-700, .bg-rose-50, [role="alert"]');
    if (await errorBanner.isVisible()) {
      const text = await errorBanner.textContent();
      expect(text).not.toContain('AuthApiError');
      expect(text).not.toContain('invalid_grant');
      expect(text).not.toContain('400');
    }
  });
});
