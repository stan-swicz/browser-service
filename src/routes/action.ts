import type { FastifyInstance } from 'fastify';
import { getSessionOrThrow } from '../services/session-manager.js';
import { executeAction } from '../playwright/actions.js';
import type { ActionRequest } from '../types/api.js';

export function registerActionRoutes(app: FastifyInstance): void {
  app.post<{ Params: { sessionId: string }; Body: ActionRequest }>(
    '/sessions/:sessionId/action',
    async (request) => {
      const start = Date.now();
      const session = getSessionOrThrow(request.params.sessionId);
      const data = await executeAction(session.page, request.body);
      return {
        success: true,
        data,
        sessionId: session.id,
        timing: { durationMs: Date.now() - start },
      };
    },
  );
}
