import { test as base, expect, type Page } from '@playwright/test'

// Test credentials - should be configured via environment variables in CI
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com'
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'adminpassword123'

// Extend base test with authentication utilities
export const test = base.extend<{
  authenticatedPage: Page
  adminPage: Page
}>({
  // Regular authenticated user fixture
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login')
    await page.fill('[name="email"]', TEST_USER_EMAIL)
    await page.fill('[name="password"]', TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    await use(page)
  },

  // Admin user fixture
  adminPage: async ({ page }, use) => {
    await page.goto('/login')
    await page.fill('[name="email"]', TEST_ADMIN_EMAIL)
    await page.fill('[name="password"]', TEST_ADMIN_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    await use(page)
  },
})

export { expect }

// Helper function to login programmatically
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

// Helper function to logout
export async function logout(page: Page) {
  // Look for logout button or user menu
  const userMenu = page.locator('[data-testid="user-menu"]')
  if (await userMenu.isVisible()) {
    await userMenu.click()
  }

  const logoutButton = page.locator('[data-testid="logout-button"]')
  if (await logoutButton.isVisible()) {
    await logoutButton.click()
  }

  await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
}
