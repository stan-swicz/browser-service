import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';

const API_KEY = process.env.API_KEY || '';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Skip auth for health endpoint
  if (request.url === '/health') return;

  // Skip auth if no API_KEY configured (development mode)
  if (!API_KEY) return;

  const apiKey =
    request.headers['x-api-key'] as string ||
    (request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice(7)
      : '');

  if (!apiKey || apiKey !== API_KEY) {
    logger.warn(`Unauthorized request to ${request.url} from ${request.ip}`);
    reply.status(401).send({ error: 'Unauthorized' });
  }
}
