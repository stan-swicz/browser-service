import type { FastifyInstance } from 'fastify';
import { isBrowserReady } from '../services/browser-pool.js';
import { getActiveSessionCount } from '../services/session-manager.js';

const startTime = Date.now();

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/health', async () => ({
    status: 'ok' as const,
    activeSessions: getActiveSessionCount(),
    browserReady: isBrowserReady(),
    uptime: Math.round((Date.now() - startTime) / 1000),
  }));
}
