import type { Page } from 'playwright';
import type { ActionRequest, ActionResult } from '../types/api.js';
import { config } from '../config.js';
import { SessionError } from '../services/session-manager.js';

export async function executeAction(page: Page, req: ActionRequest): Promise<ActionResult> {
  const timeout = req.timeout ?? config.defaults.actionTimeout;
  const waitAfterMs = req.waitAfterMs ?? config.defaults.waitAfterAction;

  let performed: string;

  switch (req.action) {
    case 'click': {
      if (!req.selector) throw new SessionError('VALIDATION_ERROR', 'click requires a selector');
      await page.click(req.selector, { timeout });
      performed = `Clicked "${req.selector}"`;
      break;
    }
    case 'type': {
      if (!req.selector) throw new SessionError('VALIDATION_ERROR', 'type requires a selector');
      if (req.value === undefined) throw new SessionError('VALIDATION_ERROR', 'type requires a value');
      await page.fill(req.selector, req.value, { timeout });
      performed = `Typed "${req.value}" into "${req.selector}"`;
      break;
    }
    case 'select': {
      if (!req.selector) throw new SessionError('VALIDATION_ERROR', 'select requires a selector');
      if (req.value === undefined) throw new SessionError('VALIDATION_ERROR', 'select requires a value');
      await page.selectOption(req.selector, req.value, { timeout });
      performed = `Selected "${req.value}" in "${req.selector}"`;
      break;
    }
    case 'scroll': {
      const amount = req.amount ?? 500;
      const delta = req.direction === 'up' ? -amount : amount;
      if (req.selector) {
        await page.locator(req.selector).evaluate((el, dy) => el.scrollBy(0, dy), delta);
        performed = `Scrolled ${req.direction ?? 'down'} ${amount}px in "${req.selector}"`;
      } else {
        await page.evaluate((dy) => window.scrollBy(0, dy), delta);
        performed = `Scrolled ${req.direction ?? 'down'} ${amount}px`;
      }
      break;
    }
    case 'wait': {
      if (req.selector) {
        await page.waitForSelector(req.selector, { timeout });
        performed = `Waited for "${req.selector}"`;
      } else {
        const ms = req.amount ?? 1000;
        await page.waitForTimeout(ms);
        performed = `Waited ${ms}ms`;
      }
      break;
    }
    case 'press': {
      if (!req.key) throw new SessionError('VALIDATION_ERROR', 'press requires a key');
      if (req.selector) {
        await page.press(req.selector, req.key, { timeout });
        performed = `Pressed "${req.key}" on "${req.selector}"`;
      } else {
        await page.keyboard.press(req.key);
        performed = `Pressed "${req.key}"`;
      }
      break;
    }
    case 'hover': {
      if (!req.selector) throw new SessionError('VALIDATION_ERROR', 'hover requires a selector');
      await page.hover(req.selector, { timeout });
      performed = `Hovered over "${req.selector}"`;
      break;
    }
    default:
      throw new SessionError('VALIDATION_ERROR', `Unknown action: ${req.action}`);
  }

  // Wait for JS to settle after action
  if (waitAfterMs > 0) {
    await page.waitForTimeout(waitAfterMs);
  }

  return {
    performed,
    url: page.url(),
    title: await page.title(),
  };
}
