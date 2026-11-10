import { pino, type Logger } from 'pino';

export type { Logger };

/** Request ids come from pino-http; secrets and tokens are redacted from every log line. */
export function createLogger(level: string): Logger {
  return pino({
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        '*.password',
        '*.apiKey',
        '*.token',
        '*.secret',
      ],
      censor: '[redacted]',
    },
  });
}
