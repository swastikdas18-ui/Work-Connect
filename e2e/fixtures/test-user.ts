import { test as base, Page } from '@playwright/test';

export interface TestUser {
  id: string;
  email: string;
  fullName: string;
  headline: string;
  cohortTag: string;
  role: 'owner' | 'admin' | 'member';
  avatarUrl: string;
}

/**
 * Generate a unique disposable test user object
 */
export function generateTestUser(prefix = 'test-user'): TestUser {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return {
    id: `u-${timestamp}-${randomSuffix}`,
    email: `${prefix}-${timestamp}-${randomSuffix}@workconnect.test`,
    fullName: `Alex Rivera ${randomSuffix.toUpperCase()}`,
    headline: 'Senior Platform Engineer',
    cohortTag: 'Engineering Cohort 2026',
    role: 'member',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  };
}

/**
 * Injects an active test authenticated session into browser localStorage.
 * Handles both the application mock user profile and Supabase session caching.
 */
export async function injectAuthenticatedSession(page: Page, customUser?: Partial<TestUser>): Promise<TestUser> {
  const user: TestUser = {
    ...generateTestUser(),
    ...customUser,
  };

  const profilePayload = {
    id: user.id,
    full_name: user.fullName,
    headline: user.headline,
    avatar_url: user.avatarUrl,
    cohort_tag: user.cohortTag,
    karma_points: 120,
    role: user.role,
  };

  await page.addInitScript(
    ({ profile, sessionKey, mockKey }) => {
      try {
        localStorage.setItem(mockKey, JSON.stringify(profile));
        localStorage.setItem(sessionKey, JSON.stringify(profile));
        // Cache membership in active public communities so portal loads hydrated state
        const initialMemberships = [
          {
            id: `m-${Date.now()}`,
            user_id: profile.id,
            community_id: 'comm-eng-core',
            role: profile.role,
            joined_at: new Date().toISOString(),
          },
        ];
        localStorage.setItem('wc_cached_memberships', JSON.stringify(initialMemberships));
      } catch (err) {
        console.error('Failed to inject auth into localStorage:', err);
      }
    },
    {
      profile: profilePayload,
      sessionKey: 'wc_auth_session_profile',
      mockKey: 'wc_mock_user_profile',
    }
  );

  return user;
}

/**
 * Cleanup helper to remove any created test items or reset cached state
 */
export async function cleanupTestSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      localStorage.removeItem('wc_mock_user_profile');
      localStorage.removeItem('wc_auth_session_profile');
      localStorage.removeItem('wc_cached_memberships');
      localStorage.removeItem('wc_cached_communities');
    } catch (err) {
      console.error('Failed to clear test localStorage:', err);
    }
  });
}

/**
 * Extended Playwright test with pre-configured fixtures
 */
export const test = base.extend<{
  authenticatedUser: TestUser;
}>({
  authenticatedUser: async ({ page }, use) => {
    const user = await injectAuthenticatedSession(page);
    await use(user);
    await cleanupTestSession(page);
  },
});

export { expect } from '@playwright/test';
