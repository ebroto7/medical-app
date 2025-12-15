
import { test, expect } from '@playwright/test';

// Credentials for testing
// To run success tests: TEST_EMAIL=user@valid.com TEST_PASSWORD=pass npx playwright test
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

const isDefaultUser = TEST_EMAIL.includes('example.com');

test.describe('Authentication System', () => {

    test('should redirect unauthenticated user to login page when accessing dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        // Expect to be redirected to /auth/login (or /login depending on your structure)
        // Adjust logic to match exact URL structure
        await expect(page).toHaveURL(/.*\/auth\/login/);
    });

    test('should fail login with invalid credentials', async ({ page }) => {
        await page.goto('/auth/login');

        await page.fill('input[type="email"]', 'wrong@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');

        // Look for the submit button specifically
        await page.click('button[type="submit"]');

        // Expect an error message to be visible
        // Based on code: <div className="p-3 bg-destructive/10 ...">{error}</div>
        await expect(page.locator('.text-destructive')).toBeVisible();
        await expect(page.locator('.text-destructive')).toContainText(/Error|invalid|incorrect/i);
    });

    // Note: This test requires a valid user in the database
    // Skip if credentials are not configured
    test('should login successfully with valid credentials', async ({ page }) => {
        if (isDefaultUser) {
            console.log('Skipping login test: No valid TEST_EMAIL provided.');
            test.skip();
            return;
        }

        // Navigate to login
        await page.goto('/auth/login');

        // Fill credentials
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);

        // Click login
        await page.click('button[type="submit"]');

        // Expect redirect to dashboard
        await expect(page).toHaveURL(/.*\/dashboard/);

        // Optional: Verify a dashboard element exists (e.g., "Bienvenido" or logout button)
        // await expect(page.getByText('Bienvenido')).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
        if (isDefaultUser) {
            test.skip();
            return;
        }

        // 1. Login first
        await page.goto('/auth/login');
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*\/dashboard/);

        // 2. Perform Logout
        // Locate the logout button. Usually in a sidebar or header.
        // Assuming there is a button with text "Cerrar Sesión" or "Logout" or an icon
        // If it's a Sidebar, might need to wait for it.
        // In Sidebar.tsx: <Button ...>Cerrar Sesión</Button>
        const logoutButton = page.locator('button', { hasText: 'Cerrar Sesión' });

        // Wait for it to be visible (sidebar might animate)
        await expect(logoutButton).toBeVisible();
        await logoutButton.click();

        // 3. Verify redirect back to login
        await expect(page).toHaveURL(/.*\/auth\/login/);

        // 4. Verify cookie is gone? Playwright manages context, checking URL is usually enough for E2E.
    });

    test('should persist session after reload', async ({ page }) => {
        if (isDefaultUser) {
            test.skip();
            return;
        }

        // 1. Login
        await page.goto('/auth/login');
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*\/dashboard/);

        // 2. Reload page
        await page.reload();

        // 3. Verify still on dashboard (middleware didn't kick us out)
        await expect(page).toHaveURL(/.*\/dashboard/);
    });

});
