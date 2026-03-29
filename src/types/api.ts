// ── Response Envelope ──

export interface SuccessResponse<T> {
  success: true;
  data: T;
  sessionId?: string;
  timing: { durationMs: number };
}

export interface ErrorResponse {
  success: false;
  error: { code: string; message: string };
  sessionId?: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// ── Error Codes ──

export type ErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'NAVIGATION_FAILED'
  | 'ACTION_FAILED'
  | 'EXTRACTION_FAILED'
  | 'MAX_SESSIONS_REACHED'
  | 'TIMEOUT'
  | 'BROWSER_ERROR'
  | 'VALIDATION_ERROR';

// ── Session ──

export interface CreateSessionRequest {
  userAgent?: string;
  viewport?: { width: number; height: number };
  locale?: string;
  timeoutMs?: number;
}

export interface SessionInfo {
  sessionId: string;
  currentUrl: string | null;
  pageTitle: string | null;
  createdAt: string;
  lastActivityAt: string;
}

// ── Navigate ──

export interface NavigateRequest {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  waitForSelector?: string;
  waitMs?: number;
}

export interface NavigateResult {
  url: string;
  status: number;
  title: string;
  loadTimeMs: number;
}

// ── Action ──

export type ActionType = 'click' | 'type' | 'select' | 'scroll' | 'wait' | 'press' | 'hover';

export interface ActionRequest {
  action: ActionType;
  selector?: string;
  value?: string;
  key?: string;
  direction?: 'up' | 'down';
  amount?: number;
  waitAfterMs?: number;
  timeout?: number;
}

export interface ActionResult {
  performed: string;
  url: string;
  title: string;
}

// ── Extract ──

export type ExtractInclude = 'text' | 'links' | 'interactive' | 'forms' | 'tables' | 'meta';

export interface ExtractRequest {
  include?: ExtractInclude[];
  selector?: string;
  textMaxLength?: number;
  linksMaxCount?: number;
  interactiveMaxCount?: number;
}

export interface ExtractMeta {
  url: string;
  title: string;
  description: string | null;
  language: string | null;
}

export interface ExtractLink {
  href: string;
  text: string;
  isExternal: boolean;
}

export interface ExtractInteractive {
  tag: string;
  type?: string;
  selector: string;
  text?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  options?: string[];
  disabled: boolean;
  role?: string;
}

export interface ExtractFormField {
  tag: string;
  type?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  required: boolean;
  selector: string;
}

export interface ExtractForm {
  action: string | null;
  method: string;
  selector: string;
  fields: ExtractFormField[];
}

export interface ExtractTable {
  selector: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export interface ExtractResult {
  meta: ExtractMeta;
  text?: string;
  links?: ExtractLink[];
  interactive?: ExtractInteractive[];
  forms?: ExtractForm[];
  tables?: ExtractTable[];
}

// ── Screenshot ──

export interface ScreenshotRequest {
  fullPage?: boolean;
  selector?: string;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export interface ScreenshotResult {
  base64: string;
  width: number;
  height: number;
  format: string;
}

// ── Batch ──

export type BatchStepType = 'navigate' | 'action' | 'extract' | 'screenshot';

export interface BatchStep {
  type: BatchStepType;
  [key: string]: unknown;
}

export interface BatchRequest {
  steps: BatchStep[];
  stopOnError?: boolean;
}

export interface BatchStepResult {
  step: number;
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}

export interface BatchResult {
  results: BatchStepResult[];
  completedSteps: number;
  totalSteps: number;
}

// ── Health ──

export interface HealthResult {
  status: 'ok';
  activeSessions: number;
  browserReady: boolean;
  uptime: number;
}
