import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { getBrowser } from './browser-pool.js';
import { logger } from '../utils/logger.js';
import type { ManagedSession } from '../types/session.js';
import type { CreateSessionRequest, SessionInfo } from '../types/api.js';

const sessions = new Map<string, ManagedSession>();
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startSessionCleanup(): void {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastActivity > session.timeoutMs) {
        logger.info(`Session ${id} expired (inactive for ${Math.round((now - session.lastActivity) / 1000)}s)`);
        destroySession(id);
      }
    }
  }, config.sessionCleanupIntervalMs);
}

export function stopSessionCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

export async function createSession(opts: CreateSessionRequest = {}): Promise<ManagedSession> {
  if (sessions.size >= config.maxSessions) {
    throw new SessionError('MAX_SESSIONS_REACHED', `Maximum ${config.maxSessions} concurrent sessions allowed`);
  }

  const browser = getBrowser();
  if (!browser) {
    throw new SessionError('BROWSER_ERROR', 'Browser is not available');
  }

  const id = uuidv4();
  const now = Date.now();
  const timeoutMs = opts.timeoutMs ?? config.sessionTimeoutMs;

  const context = await browser.newContext({
    userAgent: opts.userAgent ?? config.defaults.userAgent,
    viewport: opts.viewport ?? config.defaults.viewport,
    locale: opts.locale ?? config.defaults.locale,
  });

  const page = await context.newPage();

  const session: ManagedSession = {
    id,
    context,
    page,
    createdAt: now,
    lastActivity: now,
    timeoutMs,
  };

  sessions.set(id, session);
  logger.info(`Session created: ${id}`);
  return session;
}

export function getSession(id: string): ManagedSession | undefined {
  const session = sessions.get(id);
  if (session) {
    session.lastActivity = Date.now();
  }
  return session;
}

export function getSessionOrThrow(id: string): ManagedSession {
  const session = getSession(id);
  if (!session) {
    throw new SessionError('SESSION_NOT_FOUND', `Session ${id} not found or expired`);
  }
  return session;
}

export async function destroySession(id: string): Promise<boolean> {
  const session = sessions.get(id);
  if (!session) return false;

  sessions.delete(id);
  try {
    await session.context.close();
  } catch {
    // Context may already be closed
  }
  logger.info(`Session destroyed: ${id}`);
  return true;
}

export async function destroyAllSessions(): Promise<void> {
  const ids = [...sessions.keys()];
  await Promise.all(ids.map(id => destroySession(id)));
}

export function listSessions(): SessionInfo[] {
  return [...sessions.values()].map(sessionToInfo);
}

export function getActiveSessionCount(): number {
  return sessions.size;
}

function sessionToInfo(s: ManagedSession): SessionInfo {
  return {
    sessionId: s.id,
    currentUrl: s.page.url() || null,
    pageTitle: null, // title requires async, omitted in list
    createdAt: new Date(s.createdAt).toISOString(),
    lastActivityAt: new Date(s.lastActivity).toISOString(),
  };
}

export class SessionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'SessionError';
  }
}
