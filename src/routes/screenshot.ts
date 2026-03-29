import type { FastifyInstance } from 'fastify';
import { getSessionOrThrow } from '../services/session-manager.js';
import type { ScreenshotRequest } from '../types/api.js';

export function registerScreenshotRoutes(app: FastifyInstance): void {
  app.post<{ Params: { sessionId: string }; Body: ScreenshotRequest }>(
    '/sessions/:sessionId/screenshot',
    async (request) => {
      const start = Date.now();
      const session = getSessionOrThrow(request.params.sessionId);
      const { fullPage, selector, format, quality } = request.body || {};

      const screenshotFormat = format ?? 'png';
      let buffer: Buffer;
      let width: number;
      let height: number;

      if (selector) {
        const element = session.page.locator(selector);
        buffer = await element.screenshot({ type: screenshotFormat, quality });
        const box = await element.boundingBox();
        width = Math.round(box?.width ?? 0);
        height = Math.round(box?.height ?? 0);
      } else {
        buffer = await session.page.screenshot({
          fullPage: fullPage ?? false,
          type: screenshotFormat,
          quality,
        });
        const viewport = session.page.viewportSize();
        if (fullPage) {
          const dims = await session.page.evaluate(() => ({
            w: document.documentElement.scrollWidth,
            h: document.documentElement.scrollHeight,
          }));
          width = dims.w;
          height = dims.h;
        } else {
          width = viewport?.width ?? 0;
          height = viewport?.height ?? 0;
        }
      }

      return {
        success: true,
        data: {
          base64: buffer.toString('base64'),
          width,
          height,
          format: screenshotFormat,
        },
        sessionId: session.id,
        timing: { durationMs: Date.now() - start },
      };
    },
  );
}
