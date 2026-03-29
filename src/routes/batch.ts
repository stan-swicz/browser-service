import type { FastifyInstance } from 'fastify';
import { getSessionOrThrow } from '../services/session-manager.js';
import { executeAction } from '../playwright/actions.js';
import { extractPage } from '../playwright/extractor.js';
import { config } from '../config.js';
import type {
  BatchRequest,
  BatchResult,
  BatchStepResult,
  ActionRequest,
  ExtractRequest,
  ScreenshotRequest,
} from '../types/api.js';

export function registerBatchRoutes(app: FastifyInstance): void {
  app.post<{ Params: { sessionId: string }; Body: BatchRequest }>(
    '/sessions/:sessionId/batch',
    async (request) => {
      const overallStart = Date.now();
      const session = getSessionOrThrow(request.params.sessionId);
      const { steps, stopOnError = true } = request.body;

      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'steps array is required and must not be empty' },
          sessionId: session.id,
        };
      }

      const results: BatchStepResult[] = [];
      let completedSteps = 0;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        try {
          let data: unknown;

          switch (step.type) {
            case 'navigate': {
              const url = step.url as string;
              if (!url) throw new Error('navigate step requires url');
              const response = await session.page.goto(url, {
                waitUntil: (step.waitUntil as 'load' | 'domcontentloaded' | 'networkidle') ?? 'domcontentloaded',
                timeout: config.defaults.navigationTimeout,
              });
              if (step.waitForSelector) {
                await session.page.waitForSelector(step.waitForSelector as string, {
                  timeout: config.defaults.navigationTimeout,
                });
              }
              if (step.waitMs && typeof step.waitMs === 'number' && step.waitMs > 0) {
                await session.page.waitForTimeout(step.waitMs);
              }
              data = {
                url: session.page.url(),
                status: response?.status() ?? 0,
                title: await session.page.title(),
              };
              break;
            }
            case 'action': {
              data = await executeAction(session.page, step as unknown as ActionRequest);
              break;
            }
            case 'extract': {
              data = await extractPage(session.page, step as unknown as ExtractRequest);
              break;
            }
            case 'screenshot': {
              const screenshotOpts = step as unknown as ScreenshotRequest;
              const fmt = screenshotOpts.format ?? 'png';
              let buffer: Buffer;
              if (screenshotOpts.selector) {
                buffer = await session.page.locator(screenshotOpts.selector).screenshot({
                  type: fmt,
                  quality: screenshotOpts.quality,
                });
              } else {
                buffer = await session.page.screenshot({
                  fullPage: screenshotOpts.fullPage ?? false,
                  type: fmt,
                  quality: screenshotOpts.quality,
                });
              }
              const viewport = session.page.viewportSize();
              data = {
                base64: buffer.toString('base64'),
                width: viewport?.width ?? 0,
                height: viewport?.height ?? 0,
                format: fmt,
              };
              break;
            }
            default:
              throw new Error(`Unknown step type: ${step.type}`);
          }

          results.push({ step: i, success: true, data });
          completedSteps++;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          results.push({
            step: i,
            success: false,
            error: { code: 'ACTION_FAILED', message },
          });
          if (stopOnError) break;
        }
      }

      return {
        success: true,
        data: {
          results,
          completedSteps,
          totalSteps: steps.length,
        } satisfies BatchResult,
        sessionId: session.id,
        timing: { durationMs: Date.now() - overallStart },
      };
    },
  );
}
