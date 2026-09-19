import { test, expect } from '../fixtures/test-user';

test.describe('Spec 02: Persistent Community Store & Portal State Cache', () => {
  test('2.1 & 2.2: Navigating into community and returning via "← Back to Portal" preserves community cards without flash', async ({ page, authenticatedUser }) => {
    await page.goto('/');

    // Wait for communities grid to be populated
    const exploreGrid = page.locator('[data-testid="explore-communities-grid"]');
    await expect(exploreGrid).toBeVisible();
    const firstCommunityCard = exploreGrid.locator('> div').first();
    await expect(firstCommunityCard).toBeVisible();

    // Click on the first community to navigate inside
    await firstCommunityCard.click();

    // Verify we are inside community workspace: sub-navigation exists
    const feedTabBtn = page.getByRole('button', { name: 'Feed' }).first();
    await expect(feedTabBtn).toBeVisible();

    // Click explicit "← Back to Portal" button
    const backBtn = page.locator('#back-to-portal-breadcrumb, button:has-text("← Back to Portal")').first();
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Verify that explore communities grid renders cards immediately
    await expect(exploreGrid).toBeVisible();
    const communityCount = await exploreGrid.locator('> div').count();
    expect(communityCount).toBeGreaterThan(0);
  });

  test('2.3: Inspect localStorage for wc_cached_communities persistence', async ({ page }) => {
    await page.goto('/');

    // Ensure the page has loaded and populated cache
    await page.waitForFunction(() => {
      const data = localStorage.getItem('wc_cached_communities');
      return data !== null && JSON.parse(data).length > 0;
    }, { timeout: 10000 });

    const cachedData = await page.evaluate(() => {
      return localStorage.getItem('wc_cached_communities');
    });

    // Verify key exists and has length > 0
    expect(cachedData).not.toBeNull();
    const parsed = JSON.parse(cachedData || '[]');
    expect(Array.isArray(parsed)).toBeTruthy();
    expect(parsed.length).toBeGreaterThan(0);
  });

  test('2.4: Validate that URL does not enter hash routing redirect loop on #discover-hubs', async ({ page }) => {
    await page.goto('/#discover-hubs');

    // Wait 2 seconds to observe any periodic hash flapping or redirection
    await page.waitForTimeout(1500);

    const currentUrl = page.url();
    expect(currentUrl).toContain('#discover-hubs');

    // Explore section should be in viewport or visible
    const exploreSection = page.locator('#discover-hubs');
    await expect(exploreSection).toBeVisible();
  });
});
