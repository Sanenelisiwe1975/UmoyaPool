type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const minLevel: Level = (process.env.LOG_LEVEL as Level) || 'info';

function log(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (ORDER[level] < ORDER[minLevel]) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const out = JSON.stringify(line);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
};
