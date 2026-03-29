import Fastify from 'fastify';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { launchBrowser, closeBrowser } from './services/browser-pool.js';
import { startSessionCleanup, stopSessionCleanup, destroyAllSessions } from './services/session-manager.js';
import { errorHandler } from './middleware/error-handler.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerSessionRoutes } from './routes/sessions.js';
import { registerNavigateRoutes } from './routes/navigate.js';
import { registerActionRoutes } from './routes/action.js';
import { registerExtractRoutes } from './routes/extract.js';
import { registerScreenshotRoutes } from './routes/screenshot.js';
import { registerBatchRoutes } from './routes/batch.js';

const app = Fastify({
  logger: false,
  bodyLimit: 10 * 1024 * 1024, // 10MB for screenshot responses etc.
});

// Global error handler
app.setErrorHandler(errorHandler);

// Register all routes
registerHealthRoutes(app);
registerSessionRoutes(app);
registerNavigateRoutes(app);
registerActionRoutes(app);
registerExtractRoutes(app);
registerScreenshotRoutes(app);
registerBatchRoutes(app);

// Startup
async function start() {
  try {
    // Launch browser before accepting requests
    await launchBrowser();
    startSessionCleanup();

    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info(`Browser service running on http://localhost:${config.port}`);
    logger.info(`Max sessions: ${config.maxSessions} | Session timeout: ${config.sessionTimeoutMs / 1000}s`);
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down...`);
  stopSessionCleanup();
  await destroyAllSessions();
  await closeBrowser();
  await app.close();
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
