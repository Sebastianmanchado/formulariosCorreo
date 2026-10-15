const APP_ID = 'ad-oo-0136-formulario';

export type LogLevel = 'info' | 'warn' | 'error';

export type LogEvent =
  | 'app.started'
  | 'draft.loaded'
  | 'draft.saved'
  | 'draft.save_failed'
  | 'draft.cleared'
  | 'catalog.loaded'
  | 'catalog.parse_failed'
  | 'catalog.migrated_v3'
  | 'catalog.created'
  | 'catalog.create_failed'
  | 'catalog.opened'
  | 'catalog.removed'
  | 'catalog.remove_failed'
  | 'currency.changed'
  | 'attachment.added'
  | 'attachment.removed'
  | 'attachments.cleared'
  | 'pdf.generation_started'
  | 'pdf.validation_failed'
  | 'pdf.generation_completed'
  | 'pdf.generation_failed'
  | 'pdf.attachment_skipped'
  | 'pdf.separator_failed'
  | 'pdf.merge_failed'
  | 'error.unhandled';

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const sessionId = createSessionId();

function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function emit(level: LogLevel, event: LogEvent, meta?: Record<string, unknown>): void {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    event,
    app: APP_ID,
    sessionId,
  };
  if (meta && Object.keys(meta).length > 0) {
    entry.meta = meta;
  }
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info(event: LogEvent, meta?: Record<string, unknown>) {
    emit('info', event, meta);
  },
  warn(event: LogEvent, meta?: Record<string, unknown>, err?: unknown) {
    const base = { ...meta };
    if (err !== undefined) {
      base.message = safeErrorMessage(err);
    }
    emit('warn', event, base);
  },
  error(event: LogEvent, meta?: Record<string, unknown>, err?: unknown) {
    const base = { ...meta };
    if (err !== undefined) {
      base.message = safeErrorMessage(err);
      if (import.meta.env.DEV && err instanceof Error && err.stack) {
        base.stack = err.stack;
      }
    }
    emit('error', event, base);
  },
};

export function initGlobalErrorHandlers(): void {
  window.addEventListener('error', (ev) => {
    logger.error('error.unhandled', {
      source: 'error',
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
      message: ev.message,
    });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    logger.error('error.unhandled', {
      source: 'unhandledrejection',
      message: safeErrorMessage(ev.reason),
    });
  });
}
