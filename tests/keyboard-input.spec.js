import { test, expect } from '@playwright/test';

test.describe('Keyboard Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should enter HR via keyboard', async ({ page }) => {
    // Click on HR display (val-hr)
    await page.click('#val-hr');
    
    // Verify popup is visible
    await expect(page.locator('#vt-touch-popup')).toBeVisible();
    
    // Type 150
    await page.keyboard.type('150');
    await page.keyboard.press('Enter');
    
    // Verify popup is hidden
    await expect(page.locator('#vt-touch-popup')).toBeHidden();
    
    // Verify HR value is 150 and has manual-override class
    const hrDisp = page.locator('#val-hr');
    await expect(hrDisp).toHaveText('150');
    await expect(hrDisp).toHaveClass(/manual-override/);
  });

  test('should cycle sub-fields with Tab in NIBP editor', async ({ page }) => {
    await page.click('#val-nibp');
    
    // Initial active sub-field is sys
    const bpSys = page.locator('#vt-bp-sys');
    const bpDia = page.locator('#vt-bp-dia');
    const bpMap = page.locator('#vt-bp-map');
    
    await expect(bpSys).toHaveClass(/active/);
    
    await page.keyboard.press('Tab');
    await expect(bpDia).toHaveClass(/active/);
    
    await page.keyboard.press('Tab');
    await expect(bpMap).toHaveClass(/active/);
    
    await page.keyboard.press('Tab');
    await expect(bpSys).toHaveClass(/active/);
  });

  test('should close popup with Escape', async ({ page }) => {
    await page.click('#val-hr');
    await expect(page.locator('#vt-touch-popup')).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(page.locator('#vt-touch-popup')).toBeHidden();
  });
});
