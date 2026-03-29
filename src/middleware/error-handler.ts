import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { SessionError } from '../services/session-manager.js';
import { logger } from '../utils/logger.js';
import type { ErrorResponse } from '../types/api.js';

const ERROR_STATUS_MAP: Record<string, number> = {
  SESSION_NOT_FOUND: 404,
  SESSION_EXPIRED: 410,
  NAVIGATION_FAILED: 502,
  ACTION_FAILED: 422,
  EXTRACTION_FAILED: 500,
  MAX_SESSIONS_REACHED: 429,
  TIMEOUT: 504,
  BROWSER_ERROR: 503,
  VALIDATION_ERROR: 400,
};

export function errorHandler(
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  logger.error(`Error: ${error.message}`);

  if (error instanceof SessionError) {
    const status = ERROR_STATUS_MAP[error.code] || 500;
    const body: ErrorResponse = {
      success: false,
      error: { code: error.code, message: error.message },
    };
    reply.status(status).send(body);
    return;
  }

  // Playwright timeout errors
  if (error.message?.includes('Timeout') || error.name === 'TimeoutError') {
    const body: ErrorResponse = {
      success: false,
      error: { code: 'TIMEOUT', message: error.message },
    };
    reply.status(504).send(body);
    return;
  }

  // Fastify validation errors
  if ('validation' in error) {
    const body: ErrorResponse = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: error.message },
    };
    reply.status(400).send(body);
    return;
  }

  // Generic error
  const body: ErrorResponse = {
    success: false,
    error: { code: 'BROWSER_ERROR', message: error.message || 'Unknown error' },
  };
  reply.status(500).send(body);
}
