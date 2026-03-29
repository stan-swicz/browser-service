import type { FastifyInstance } from 'fastify';
import { getSessionOrThrow } from '../services/session-manager.js';
import { extractPage } from '../playwright/extractor.js';
import type { ExtractRequest } from '../types/api.js';

export function registerExtractRoutes(app: FastifyInstance): void {
  app.post<{ Params: { sessionId: string }; Body: ExtractRequest }>(
    '/sessions/:sessionId/extract',
    async (request) => {
      const start = Date.now();
      const session = getSessionOrThrow(request.params.sessionId);
      const data = await extractPage(session.page, request.body || {});
      return {
        success: true,
        data,
        sessionId: session.id,
        timing: { durationMs: Date.now() - start },
      };
    },
  );
}
