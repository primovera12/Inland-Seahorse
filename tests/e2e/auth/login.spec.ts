import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('shows login page for unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard')
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')

    // Check for essential elements
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error message (adjust selector based on your UI)
    await expect(page.locator('[role="alert"], .error, [data-testid="error-message"]')).toBeVisible({
      timeout: 5000,
    })
  })

  test('successful login redirects to dashboard', async ({ page }) => {
    // Skip if no test credentials are configured
    const testEmail = process.env.TEST_USER_EMAIL
    const testPassword = process.env.TEST_USER_PASSWORD

    if (!testEmail || !testPassword) {
      test.skip()
      return
    }

    await page.goto('/login')

    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.click('button[type="submit"]')

    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('forgot password link exists', async ({ page }) => {
    await page.goto('/login')

    // Look for forgot password link
    const forgotLink = page.locator('a[href*="forgot-password"]')
    await expect(forgotLink).toBeVisible()
  })
})

test.describe('Protected Routes', () => {
  test('dashboard requires authentication', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('quotes page requires authentication', async ({ page }) => {
    await page.goto('/quotes')
    await expect(page).toHaveURL(/\/login/)
  })

  test('settings page requires authentication', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/login/)
  })

  test('customers page requires authentication', async ({ page }) => {
    await page.goto('/customers')
    await expect(page).toHaveURL(/\/login/)
  })

  test('team page requires authentication', async ({ page }) => {
    await page.goto('/team')
    await expect(page).toHaveURL(/\/login/)
  })

  test('inland quotes page requires authentication', async ({ page }) => {
    await page.goto('/inland')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Session Management', () => {
  test('login form validates email format', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'not-an-email')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should show validation error or not submit
    // Check that we're still on the login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('login form requires password', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'test@example.com')
    // Leave password empty
    await page.click('button[type="submit"]')

    // Should show validation error or not submit
    await expect(page).toHaveURL(/\/login/)
  })
})
