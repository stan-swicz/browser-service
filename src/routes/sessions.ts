import type { FastifyInstance } from 'fastify';
import {
  createSession,
  getSessionOrThrow,
  destroySession,
  listSessions,
} from '../services/session-manager.js';
import type { CreateSessionRequest } from '../types/api.js';

export function registerSessionRoutes(app: FastifyInstance): void {
  // Create session
  app.post<{ Body: CreateSessionRequest }>('/sessions', async (request) => {
    const start = Date.now();
    const session = await createSession(request.body || {});
    return {
      success: true,
      data: {
        sessionId: session.id,
        createdAt: new Date(session.createdAt).toISOString(),
        expiresAt: new Date(session.createdAt + session.timeoutMs).toISOString(),
      },
      sessionId: session.id,
      timing: { durationMs: Date.now() - start },
    };
  });

  // List sessions
  app.get('/sessions', async () => {
    return {
      success: true,
      data: listSessions(),
      timing: { durationMs: 0 },
    };
  });

  // Get session
  app.get<{ Params: { sessionId: string } }>('/sessions/:sessionId', async (request) => {
    const session = getSessionOrThrow(request.params.sessionId);
    const title = await session.page.title().catch(() => null);
    return {
      success: true,
      data: {
        sessionId: session.id,
        currentUrl: session.page.url() || null,
        pageTitle: title,
        createdAt: new Date(session.createdAt).toISOString(),
        lastActivityAt: new Date(session.lastActivity).toISOString(),
      },
      sessionId: session.id,
      timing: { durationMs: 0 },
    };
  });

  // Delete session
  app.delete<{ Params: { sessionId: string } }>('/sessions/:sessionId', async (request) => {
    const start = Date.now();
    const closed = await destroySession(request.params.sessionId);
    if (!closed) {
      return {
        success: false,
        error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' },
      };
    }
    return {
      success: true,
      data: { closed: true },
      sessionId: request.params.sessionId,
      timing: { durationMs: Date.now() - start },
    };
  });
}
