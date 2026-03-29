import type { FastifyInstance } from 'fastify';
import { getSessionOrThrow } from '../services/session-manager.js';
import type { NavigateRequest } from '../types/api.js';
import { config } from '../config.js';

export function registerNavigateRoutes(app: FastifyInstance): void {
  app.post<{ Params: { sessionId: string }; Body: NavigateRequest }>(
    '/sessions/:sessionId/navigate',
    async (request) => {
      const start = Date.now();
      const session = getSessionOrThrow(request.params.sessionId);
      const { url, waitUntil, waitForSelector, waitMs } = request.body;

      if (!url) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'url is required' },
          sessionId: session.id,
        };
      }

      const response = await session.page.goto(url, {
        waitUntil: waitUntil ?? 'domcontentloaded',
        timeout: config.defaults.navigationTimeout,
      });

      if (waitForSelector) {
        await session.page.waitForSelector(waitForSelector, {
          timeout: config.defaults.navigationTimeout,
        });
      }

      if (waitMs && waitMs > 0) {
        await session.page.waitForTimeout(waitMs);
      }

      return {
        success: true,
        data: {
          url: session.page.url(),
          status: response?.status() ?? 0,
          title: await session.page.title(),
          loadTimeMs: Date.now() - start,
        },
        sessionId: session.id,
        timing: { durationMs: Date.now() - start },
      };
    },
  );
}
