import type { BrowserContext, Page } from 'playwright';

export interface ManagedSession {
  id: string;
  context: BrowserContext;
  page: Page;
  createdAt: number;
  lastActivity: number;
  timeoutMs: number;
}
