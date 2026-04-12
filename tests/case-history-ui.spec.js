import { test, expect } from '@playwright/test';

test.describe('Case History & Resume', () => {
    test.beforeEach(async ({ page }) => {
        // Use the dev server port that vite assigned
        await page.goto('https://localhost:5174/');
        
        // Wait for app to initialize
        await page.waitForSelector('.status-bar');
    });

    test('should save a local case and show it in history', async ({ page }) => {
        // 1. Start a case
        const startBtn = page.getByRole('button', { name: 'Starta Narkos' }).or(page.getByRole('button', { name: 'Start Case' }));
        await startBtn.click();
        
        // Fill out settings (new case modal is open)
        await page.locator('#patient-weight-btn').click();
        await page.locator('.touch-numpad >> button:has-text("1")').click();
        await page.locator('.touch-numpad >> button:has-text("2")').click();
        await page.locator('.touch-numpad >> button:has-text("OK")').click();
        
        await page.getByRole('button', { name: 'Spara' }).or(page.getByRole('button', { name: 'Start Case' })).click();
        
        // Timer should start
        await expect(page.locator('#timer')).not.toHaveText('00:00:00');
        
        // Wait a small bit so duration > 0s
        await page.waitForTimeout(1000);
        
        // 2. Stop the case
        const stopBtn = page.getByRole('button', { name: 'Avsluta Narkos' }).or(page.getByRole('button', { name: 'Stop Case' }));
        await stopBtn.click();
        
        // Confirm stop
        await page.getByRole('button', { name: 'Ja, Avsluta' }).click();
        
        // Timer should reset
        await expect(page.locator('#timer')).toHaveText('00:00:00');
        
        // 3. Open History
        await page.getByRole('button', { name: '⚙️' }).click(); // Open settings
        await page.getByTitle('Historik').or(page.getByTitle('History')).click(); // Open history tab
        
        // Verify history view is visible
        const historyView = page.locator('#case-history-view');
        await expect(historyView).toBeVisible();
        
        // Wait for list to render (it's async)
        await page.waitForSelector('.history-card');
        
        // Verify our case is there
        const firstCard = page.locator('.history-card').first();
        await expect(firstCard).toContainText('12kg');
        await expect(firstCard).toContainText('📱'); // Local badge
        
        // 4. Preview the case
        await firstCard.locator('.history-card-info').click();
        
        // Verify preview modal
        const previewModal = page.locator('#journal-preview-modal');
        await expect(previewModal).toBeVisible();
        await expect(page.locator('#preview-title')).toContainText('12kg');
        
        // 5. Resume the case
        await page.getByRole('button', { name: /Resume|Återuppta/ }).click();
        
        // Confirm resume
        page.on('dialog', dialog => dialog.accept()); // auto-accept the native confirm
        
        // Timer should be running again
        await expect(page.locator('#timer')).not.toHaveText('00:00:00');
    });
});
