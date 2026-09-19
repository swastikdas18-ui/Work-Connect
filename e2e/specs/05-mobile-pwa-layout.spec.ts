import { test, expect } from '../fixtures/test-user';

test.describe('Spec 05: Mobile PWA Layout & Touch Target Ergonomics', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });

  test('5.1 & 5.2: Set viewport to 390 × 844 and assert document.documentElement has zero horizontal overflow', async ({ page, authenticatedUser }) => {
    await page.goto('/');

    // Wait for the app layout to stabilize
    await expect(page.locator('[data-testid="explore-communities-grid"]')).toBeVisible();

    // Verify horizontal overflow is strictly non-existent
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);

    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1); // allow 1px rounding edge
    expect(scrollWidth).toBe(390);
  });

  test('5.3: "← Back to Portal" button inside community is visible and has height >= 36px for mobile thumbs', async ({ page, authenticatedUser }) => {
    await page.goto('/');

    // Navigate inside community
    const exploreGrid = page.locator('[data-testid="explore-communities-grid"]');
    await expect(exploreGrid).toBeVisible();
    await exploreGrid.locator('> div').first().click();

    // Verify back button is visible on mobile
    const backBtn = page.locator('#back-to-portal-breadcrumb, button:has-text("← Back to Portal")').first();
    await expect(backBtn).toBeVisible();

    // Check bounding box height for touch ergonomics
    const box = await backBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(36); // standard mobile touch target
    }
  });

  test('5.4: Profile avatar dropdown opens on mobile and triggers clean sign-out', async ({ page, authenticatedUser }) => {
    await page.goto('/');

    // Locate the profile avatar trigger button
    const avatarTrigger = page.locator('#profile-dropdown-trigger, button:has(img[alt])').first();
    await expect(avatarTrigger).toBeVisible();
    await avatarTrigger.click();

    // Dropdown popover should appear with Log Out option
    const logoutBtn = page.getByRole('button', { name: /Log Out/i });
    await expect(logoutBtn).toBeVisible();

    // Click Log Out
    await logoutBtn.click();

    // Verify user is signed out: Sign In and Get Started buttons reappear in header
    await expect(page.getByRole('button', { name: /Sign In/i }).first()).toBeVisible();
  });
});
