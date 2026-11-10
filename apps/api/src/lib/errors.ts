import type { ErrorResponse } from '@prompt-engine/shared-types';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from './logger.js';

/** An error that is safe to show the client: status, stable code, message and optional details. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'not_found', `No route for ${req.method} ${req.path}`));
};

/** body-parser errors carry a `type`; map the ones caused by the client to 4xx. */
function fromBodyParser(err: unknown): AppError | null {
  if (typeof err !== 'object' || err === null || !('type' in err)) return null;
  switch ((err as { type: unknown }).type) {
    case 'entity.parse.failed':
      return new AppError(400, 'invalid_json', 'Request body is not valid JSON');
    case 'entity.too.large':
      return new AppError(413, 'request_too_large', 'Request body is too large');
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return new AppError(415, 'unsupported_media_type', 'Unsupported request encoding');
    default:
      return null;
  }
}

/** Last middleware: every error leaves in the `{ error: { code, message, details } }` shape. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const known = err instanceof AppError ? err : fromBodyParser(err);
    if (known) {
      const body: ErrorResponse = { error: { code: known.code, message: known.message } };
      if (known.details !== undefined) body.error.details = known.details;
      res.status(known.status).json(body);
      return;
    }
    logger.error({ err, reqId: req.id }, 'unhandled error');
    const body: ErrorResponse = { error: { code: 'internal_error', message: 'Internal error' } };
    res.status(500).json(body);
  };
}
