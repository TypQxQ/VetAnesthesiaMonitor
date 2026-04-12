import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('AI Extraction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Mock the Gemini API
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  hr: 150,
                  spo2: 98,
                  etco2: 40,
                  rr: 20,
                  nibp_sys: 120,
                  nibp_dia: 80,
                  nibp_map: 93,
                  temp: 38.5,
                  fio2: 40,
                  detected_species: "Dog",
                  detected_weight: 15.5,
                  alarms: [],
                  monitor_model: "Mock Monitor"
                })
              }]
            }
          }]
        })
      });
    });
  });

  test('should simulate AI extraction with sample image', async ({ page }) => {
    // Resolve path to a sample image
    const samplePath = path.resolve(process.cwd(), 'resources/samples/IMG_4856.JPG');
    if (!fs.existsSync(samplePath)) {
        test.skip(true, 'Sample image not found');
        return;
    }
    const sampleBuffer = fs.readFileSync(samplePath);
    const sampleDataUrl = `data:image/jpeg;base64,${sampleBuffer.toString('base64')}`;

    // Mock the camera frame capture
    await page.evaluate((dataUrl) => {
      window.wakeAndCapture = async () => dataUrl;
      window.captureCameraFrame = () => dataUrl;
    }, sampleDataUrl);

    // Initial state: ensure "Start Case" is visible
    await expect(page.locator('#btn-power')).toContainText('Starta Narkos');

    // Trigger capture (Fota button)
    const btnCapture = page.locator('#btn-manual-capture');
    await btnCapture.click();

    // Verify processing state
    await expect(page.locator('.status-bar')).toBeVisible(); 
    // Wait for the consensus and state updates
    
    // Since we mock species/weight, the settings modal should auto-open for confirmation
    await expect(page.locator('#settings-modal')).toHaveClass(/open/);
    
    // Verify values in settings
    await expect(page.locator('#patient-weight-btn')).toContainText('15.5 kg');
    
    // Confirm and save settings
    await page.click('#btn-save-settings');
    
    // Verify Values Table shows extracted values
    await expect(page.locator('#val-hr')).toHaveText('150');
    await expect(page.locator('#val-spo2')).toHaveText('98');
    await expect(page.locator('#val-etco2')).toHaveText('40');
  });
});
