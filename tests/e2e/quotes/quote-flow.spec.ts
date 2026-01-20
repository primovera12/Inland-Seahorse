import { test, expect } from '../fixtures/auth'

test.describe('Quote Management', () => {
  test.describe('Quote List', () => {
    test('displays quotes list page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/quotes')

      // Should see the quotes page
      await expect(authenticatedPage).toHaveURL(/\/quotes/)

      // Should have a create button or link
      await expect(
        authenticatedPage.locator('[data-testid="create-quote"], a[href*="quotes/new"], button:has-text("New Quote"), button:has-text("Create")')
      ).toBeVisible({ timeout: 10000 })
    })

    test('can navigate to create new quote', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/quotes')

      // Click create button
      const createButton = authenticatedPage.locator(
        '[data-testid="create-quote"], a[href*="quotes/new"], button:has-text("New Quote"), button:has-text("Create")'
      ).first()
      await createButton.click()

      // Should navigate to create quote page
      await expect(authenticatedPage).toHaveURL(/\/quotes\/new|\/quotes\/create/, { timeout: 10000 })
    })
  })

  test.describe('Quote Creation', () => {
    test('shows quote form fields', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/quotes/new')

      // Should have customer name field
      await expect(
        authenticatedPage.locator('input[name="customer_name"], input[placeholder*="customer"], [data-testid="customer-name"]')
      ).toBeVisible({ timeout: 10000 })
    })

    test('validates required fields', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/quotes/new')

      // Try to submit without filling required fields
      const submitButton = authenticatedPage.locator(
        'button[type="submit"], button:has-text("Save"), button:has-text("Create")'
      ).first()

      if (await submitButton.isVisible()) {
        await submitButton.click()

        // Should show validation errors or stay on page
        await expect(authenticatedPage).toHaveURL(/\/quotes\/new|\/quotes\/create/)
      }
    })
  })

  test.describe('Public Quote Link', () => {
    test('public quote page is accessible without login', async ({ page }) => {
      // Try accessing a quote with a dummy token
      // This will show error page or quote not found, but should not redirect to login
      await page.goto('/quote/public/00000000-0000-4000-a000-000000000000')

      // Should NOT redirect to login (it's a public route)
      await expect(page).not.toHaveURL(/\/login/)
    })
  })
})

test.describe('Inland Quote Management', () => {
  test('displays inland quotes list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inland')

    // Should see the inland quotes page
    await expect(authenticatedPage).toHaveURL(/\/inland/)
  })

  test('can navigate to create new inland quote', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inland')

    // Click create button
    const createButton = authenticatedPage.locator(
      '[data-testid="create-quote"], a[href*="inland/new"], button:has-text("New Quote"), button:has-text("Create")'
    ).first()

    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click()
      // Should navigate to create inland quote page
      await expect(authenticatedPage).toHaveURL(/\/inland\/new|\/inland\/create/, { timeout: 10000 })
    }
  })
})
