/**
 * Attendance scan stress test: simulates 1000 scans from the web UI.
 * Uses card numbers 1–748 (valid) plus wrong/invalid card numbers, shuffled.
 *
 * Usage:
 *   Set env: BASE_URL, LOGIN_EMAIL, LOGIN_PASSWORD
 *   Optional: ATTENDANCE_SESSION_ID (if not set, first open session is used)
 *
 *   npx playwright test e2e/attendance-stress.spec.ts
 *   npx playwright test e2e/attendance-stress.spec.ts --headed   # watch browser
 */
/// <reference types="node" />

import { test, expect } from '@playwright/test';

const TOTAL_SCANS = 1000;
const VALID_CARD_MIN = 1;
const VALID_CARD_MAX = 748;

/** Build shuffled list of 1000 card numbers: valid (1–748) + invalid, mixed. */
function buildShuffledCardNumbers(): string[] {
  const valid: string[] = [];
  for (let i = VALID_CARD_MIN; i <= VALID_CARD_MAX; i++) {
    valid.push(String(i));
  }

  const invalid = [
    '0',
    '749',
    '750',
    '999',
    '1000',
    '1234',
    '5000',
    '9999',
    '10000',
    '12345',
    '66666',
    '111111',
    '000',
    '00',
    '-1',
    'abc',
    'wrong',
    'invalid',
    'xxx',
    'N/A',
    'unknown',
    '99999',
    '7480',  // typo-style
    '74 8',
    '74a',
  ];

  const pool: string[] = [];
  // Add valid cards (repeat to reach 1000, then trim)
  const validCount = Math.floor(TOTAL_SCANS * 0.75); // ~75% valid
  const invalidCount = TOTAL_SCANS - validCount;

  for (let i = 0; i < validCount; i++) {
    pool.push(valid[i % valid.length]);
  }
  for (let i = 0; i < invalidCount; i++) {
    pool.push(invalid[i % invalid.length]);
  }

  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, TOTAL_SCANS);
}

test.describe('Attendance scan stress', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus && testInfo.status === 'failed') {
      await page.pause();
    }
  });

  test('simulate 1000 attendance scans with mixed valid and invalid card numbers', async ({ page }) => {
    test.setTimeout(600000);

    const baseUrl = process.env.BASE_URL || 'https://localhost:5173';
    const email = process.env.LOGIN_EMAIL;
    const password = process.env.LOGIN_PASSWORD;
    const sessionId = process.env.ATTENDANCE_SESSION_ID;

    test.skip(!email || !password, 'Set LOGIN_EMAIL and LOGIN_PASSWORD to run the stress test.');

    const cardNumbers = buildShuffledCardNumbers();
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    // Login – use 'load' and long timeout; retry once if dev server was cold
    const authUrl = `${baseUrl}/auth`;
    let authLoaded = false;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await page.goto(authUrl, {
          waitUntil: 'load',
          timeout: 60000,
        });
        authLoaded = true;
        break;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (attempt === 2) {
          console.error(`\nCould not load ${authUrl}. Ensure "npm run dev" is running in another terminal. Error: ${msg}`);
          throw e;
        }
        await page.waitForTimeout(2000);
      }
    }
    if (!authLoaded) throw new Error('Failed to load auth page');

    await page.locator('#signin-email').fill(email);
    await page.locator('#signin-password').fill(password);
    await page.getByRole('button', { name: /sign in|ننوتل|login|داخل/i }).click();
    await page.waitForURL(/\/(dashboard|attendance)/, { timeout: 15000 });

    // Go to attendance marking (with optional session)
    const markingUrl = sessionId
      ? `${baseUrl}/attendance/marking?session=${sessionId}`
      : `${baseUrl}/attendance/marking`;
    await page.goto(markingUrl, { waitUntil: 'load', timeout: 30000 });

    // Wait for tabs to be ready, then switch to Barcode tab (card number scan)
    const barcodeTab = page.getByTestId('attendance-tab-barcode');
    await barcodeTab.waitFor({ state: 'visible', timeout: 10000 });
    await barcodeTab.click();
    await page.waitForTimeout(400);

    const scanInputLocator = () => page.getByTestId('attendance-scan-card-input');
    await scanInputLocator().waitFor({ state: 'visible', timeout: 10000 });
    await scanInputLocator().scrollIntoViewIfNeeded();

    if (!sessionId) {
      await page.waitForTimeout(500);
    }

    const scanUrlPattern = /\/attendance-sessions\/[^/]+\/scan$/;
    const markingPath = '/attendance/marking';
    let completedScans = 0;

    for (let i = 0; i < cardNumbers.length; i++) {
      try {
        if (!page.url().includes(markingPath)) {
          console.log(`Stopped: page navigated away from marking (current: ${page.url()}) after ${i} scans`);
          break;
        }

        const scanInput = scanInputLocator();
        const card = cardNumbers[i];
        await scanInput.click();
        await scanInput.fill('');
        await scanInput.fill(card);

        const responsePromise = page.waitForResponse(
          (res) => res.url().match(scanUrlPattern) != null && res.request().method() === 'POST',
          { timeout: 20000 }
        );
        await scanInput.press('Enter');
        const response = await responsePromise;
        const status = response.status();
        if (status >= 200 && status < 300) successCount++;
        else errorCount++;
        completedScans = i + 1;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('closed') || msg.includes('Target page')) {
          console.log(`Stopped after ${i} scans: page/context closed (${msg.slice(0, 60)}...)`);
        } else {
          console.log(`Stopped after ${i} scans: ${msg}`);
        }
        completedScans = i;
        break;
      }

      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1}/${TOTAL_SCANS} scans (${successCount} ok, ${errorCount} errors)`);
      }

      await page.waitForTimeout(60);
    }

    const elapsed = (Date.now() - startTime) / 1000;

    console.log('--- Stress test results ---');
    console.log(`Completed scans: ${completedScans} (requested: ${cardNumbers.length})`);
    console.log(`Success (2xx): ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Duration: ${elapsed.toFixed(1)}s`);
    console.log(`Scans/sec: ${completedScans > 0 ? (completedScans / elapsed).toFixed(1) : 0}`);

    expect(completedScans).toBeGreaterThan(0);
  });
});
