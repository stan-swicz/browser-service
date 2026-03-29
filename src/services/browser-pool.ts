import { chromium, type Browser } from 'playwright';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let browser: Browser | null = null;

export async function launchBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;

  logger.info('Launching Chromium...');
  browser = await chromium.launch({
    headless: config.browserHeadless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  browser.on('disconnected', () => {
    logger.warn('Browser disconnected');
    browser = null;
  });

  logger.info('Chromium launched');
  return browser;
}

export function getBrowser(): Browser | null {
  return browser?.isConnected() ? browser : null;
}

export function isBrowserReady(): boolean {
  return browser !== null && browser.isConnected();
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    logger.info('Closing browser...');
    await browser.close().catch(() => {});
    browser = null;
    logger.info('Browser closed');
  }
}
