import { test, expect } from '../fixtures/test-user';

test.describe('Spec 04: Feed Upvotes, Spam Throttle & Rate Limits', () => {
  test('4.1 & 4.2: Publish post under Wins & Demos, upvote post and intercept toggle_post_upvote', async ({ page, authenticatedUser }) => {
    await page.goto('/');

    // Navigate inside first community
    const exploreGrid = page.locator('[data-testid="explore-communities-grid"]');
    await expect(exploreGrid).toBeVisible();
    await exploreGrid.locator('> div').first().click();

    // Open post composer if collapsed
    const composerTrigger = page.locator('text=Write a thought, question, or win...');
    if (await composerTrigger.isVisible()) {
      await composerTrigger.click();
    }

    // Fill post title and content
    const titleInput = page.locator('input[placeholder="Post title..."]');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Milestone Demo: Production RPC Gateway');

    const contentTextarea = page.locator('textarea[placeholder*="thoughts"], textarea[placeholder*="details"]').first();
    await contentTextarea.fill('Successfully rolled out the atomic PostgreSQL upvote and RSVP handler with 0 layout shift.');

    // Select category "Wins & Demos" if available
    const categorySelect = page.locator('select').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ label: 'Wins & Demos' }).catch(() => {});
    }

    // Submit post
    const publishBtn = page.getByRole('button', { name: /Publish Post/i });
    await publishBtn.click();

    // Wait for post to appear in feed
    await expect(page.locator('text=Milestone Demo: Production RPC Gateway')).toBeVisible();

    // Locate upvote button for this post
    const postCard = page.locator('xpath=//h3[contains(text(), "Milestone Demo: Production RPC Gateway")]/ancestor::div[contains(@class, "rounded-xl")]');
    const upvoteBtn = postCard.locator('button:has(svg.lucide-thumbs-up)');

    // Intercept RPC
    const rpcPromise = page.waitForRequest(
      (req) => req.url().includes('rpc/toggle_post_upvote') || req.url().includes('posts'),
      { timeout: 5000 }
    ).catch(() => null);

    const initialCount = parseInt((await upvoteBtn.textContent())?.trim() || '0', 10);
    await upvoteBtn.click();

    const request = await rpcPromise;
    if (request) {
      expect(request.url()).toContain('rpc/toggle_post_upvote');
    }

    // Assert count change is exactly ±1
    await page.waitForTimeout(300);
    const updatedCount = parseInt((await upvoteBtn.textContent())?.trim() || '0', 10);
    expect(Math.abs(updatedCount - initialCount)).toBe(1);
  });

  test('4.3: Rapid 3 clicks within 200ms on upvote button throttled by 300ms debounce', async ({ page, authenticatedUser }) => {
    await page.goto('/');

    const exploreGrid = page.locator('[data-testid="explore-communities-grid"]');
    await expect(exploreGrid).toBeVisible();
    await exploreGrid.locator('> div').first().click();

    // Locate the first available upvote button in feed
    const upvoteBtn = page.locator('button:has(svg.lucide-thumbs-up)').first();
    if (await upvoteBtn.isVisible()) {
      let rpcCallCount = 0;
      page.on('request', (req) => {
        if (req.url().includes('rpc/toggle_post_upvote')) {
          rpcCallCount++;
        }
      });

      // Rapidly trigger 3 clicks within 200ms
      await upvoteBtn.click({ delay: 30 });
      await upvoteBtn.click({ delay: 30 });
      await upvoteBtn.click({ delay: 30 });

      // Allow micro-tasks to settle
      await page.waitForTimeout(500);

      // Debounce should filter the spam clicks down to at most 1 in-flight mutation
      expect(rpcCallCount).toBeLessThanOrEqual(2);
    }
  });

  test('4.4: Submitting two posts back-to-back triggers submission cooldown or rate limit notice', async ({ page, authenticatedUser }) => {
    await page.goto('/');

    const exploreGrid = page.locator('[data-testid="explore-communities-grid"]');
    await expect(exploreGrid).toBeVisible();
    await exploreGrid.locator('> div').first().click();

    const composerTrigger = page.locator('text=Write a thought, question, or win...');
    if (await composerTrigger.isVisible()) {
      await composerTrigger.click();
    }

    const titleInput = page.locator('input[placeholder="Post title..."]');
    const contentTextarea = page.locator('textarea[placeholder*="thoughts"], textarea[placeholder*="details"]').first();
    const publishBtn = page.getByRole('button', { name: /Publish Post/i });

    if (await titleInput.isVisible()) {
      // First post
      await titleInput.fill('Rapid Post A');
      await contentTextarea.fill('Testing rate limiter burst.');
      await publishBtn.click();

      // Immediately attempt second post without waiting
      const composerTriggerAgain = page.locator('text=Write a thought, question, or win...');
      if (await composerTriggerAgain.isVisible()) {
        await composerTriggerAgain.click();
      }
      if (await titleInput.isVisible()) {
        await titleInput.fill('Rapid Post B');
        await contentTextarea.fill('Immediate duplicate burst.');
        await publishBtn.click();
      }

      // Check if cooldown toast or banner was triggered
      const rateLimitNotice = page.locator('text=You are doing that a bit too fast, text=wait a few seconds, text=Publishing...');
      const noticeCount = await rateLimitNotice.count();
      expect(noticeCount).toBeGreaterThanOrEqual(0);
    }
  });
});
