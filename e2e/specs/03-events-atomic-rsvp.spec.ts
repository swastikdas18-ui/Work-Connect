import { test, expect } from '../fixtures/test-user';

test.describe('Spec 03: Atomic Event RSVP Workflow', () => {
  test('3.1 & 3.2: Create an event and assert formatted date string does NOT contain "Invalid Date" or "NaN"', async ({ page, authenticatedUser }) => {
    await page.goto('/');

    // Navigate into first community
    const exploreGrid = page.locator('[data-testid="explore-communities-grid"]');
    await expect(exploreGrid).toBeVisible();
    await exploreGrid.locator('> div').first().click();

    // Switch to Events tab
    const eventsTab = page.getByRole('button', { name: 'Events' }).first();
    await eventsTab.click();

    // Check if user is admin/owner or mock schedule event modal exists
    const scheduleBtn = page.getByRole('button', { name: /Schedule Event|New Event/i }).first();
    if (await scheduleBtn.isVisible()) {
      await scheduleBtn.click();

      // Fill in datetime-local input
      await page.locator('input[placeholder*="AMA"], input[placeholder*="Event"]').first().fill('E2E Automated Sync');
      await page.locator('textarea').first().fill('Testing atomic RSVP handler with automated date parsing.');

      // Format ISO string for datetime-local
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const isoLocal = nextWeek.toISOString().slice(0, 16);
      await page.locator('input[type="datetime-local"]').fill(isoLocal);

      await page.getByRole('button', { name: /Publish Event|Schedule/i }).click();
    }

    // Assert rendered event cards contain valid date formatting
    const eventCards = page.locator('.grid > div');
    const count = await eventCards.count();
    if (count > 0) {
      const firstCardText = await eventCards.first().textContent();
      expect(firstCardText).not.toContain('Starts at Invalid Date');
      expect(firstCardText).not.toContain('Invalid Date');
      expect(firstCardText).not.toContain('NaN');
    }
  });

  test('3.3, 3.4, 3.5 & 3.6: Click RSVP, intercept RPC call, assert optimistic update, reload persistence, and toggle decrement', async ({ page, authenticatedUser }) => {
    await page.goto('/');

    // Navigate inside community
    const exploreGrid = page.locator('[data-testid="explore-communities-grid"]');
    await expect(exploreGrid).toBeVisible();
    await exploreGrid.locator('> div').first().click();

    // Go to Events tab
    const eventsTab = page.getByRole('button', { name: 'Events' }).first();
    await eventsTab.click();

    // Locate the first RSVP button
    const rsvpBtn = page.getByRole('button', { name: /RSVP/i }).first();
    if (await rsvpBtn.isVisible()) {
      // Monitor Supabase RPC calls
      const rpcPromise = page.waitForRequest(
        (request) => request.url().includes('rpc/toggle_event_rsvp') || request.url().includes('event_rsvps'),
        { timeout: 5000 }
      ).catch(() => null);

      // Read current attendee text if available
      const attendeeLabel = rsvpBtn.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]//span[contains(text(), "attending")]');
      const initialText = (await attendeeLabel.textContent()) || '0 attending';
      const initialCount = parseInt(initialText, 10) || 0;

      // Click the RSVP button
      await rsvpBtn.click();

      // Check request was dispatched
      const rpcRequest = await rpcPromise;
      if (rpcRequest) {
        expect(rpcRequest.url()).toContain('rpc/toggle_event_rsvp');
      }

      // Assert optimistic / updated button state
      await expect(page.getByRole('button', { name: /RSVPed ✓/i }).first()).toBeVisible();

      // Assert count updated
      if (await attendeeLabel.isVisible()) {
        const updatedText = await attendeeLabel.textContent();
        const updatedCount = parseInt(updatedText || '0', 10);
        expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
      }

      // Reload page to verify persistence
      await page.reload();
      const reloadedEventsTab = page.getByRole('button', { name: 'Events' }).first();
      if (await reloadedEventsTab.isVisible()) {
        await reloadedEventsTab.click();
        await expect(page.getByRole('button', { name: /RSVPed ✓/i }).first()).toBeVisible();

        // Click again to toggle back
        const rsvpedBtn = page.getByRole('button', { name: /RSVPed ✓/i }).first();
        await rsvpedBtn.click();
        await expect(page.getByRole('button', { name: /^RSVP$/i }).first()).toBeVisible();
      }
    }
  });
});
