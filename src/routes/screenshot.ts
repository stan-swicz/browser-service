import type { FastifyInstance } from 'fastify';
import { getSessionOrThrow } from '../services/session-manager.js';
import type { ScreenshotRequest } from '../types/api.js';

export function registerScreenshotRoutes(app: FastifyInstance): void {
  // Lightweight GET for polling (bot protection flow)
  app.get<{ Params: { sessionId: string } }>(
    '/sessions/:sessionId/screenshot',
    async (request) => {
      const start = Date.now();
      const session = getSessionOrThrow(request.params.sessionId);

      const buffer = await session.page.screenshot({ type: 'png', fullPage: false });
      const viewport = session.page.viewportSize();

      return {
        success: true,
        data: {
          screenshot: buffer.toString('base64'),
          width: viewport?.width ?? 0,
          height: viewport?.height ?? 0,
        },
        sessionId: session.id,
        timing: { durationMs: Date.now() - start },
      };
    },
  );

  // Full-featured POST (existing)
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
