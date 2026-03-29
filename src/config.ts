export const config = {
  port: parseInt(process.env.PORT || '9004', 10),
  maxSessions: parseInt(process.env.MAX_SESSIONS || '10', 10),
  sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS || '300000', 10),
  browserHeadless: process.env.BROWSER_HEADLESS !== 'false',
  sessionCleanupIntervalMs: 30_000,
  defaults: {
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    navigationTimeout: 30_000,
    actionTimeout: 10_000,
    waitAfterAction: 500,
    textMaxLength: 50_000,
    linksMaxCount: 200,
    interactiveMaxCount: 100,
    tableRowsMax: 50,
  },
} as const;
