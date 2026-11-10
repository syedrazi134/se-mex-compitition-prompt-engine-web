import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

const KEY = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * Writes that cost money (/checkout, /creator/payouts, /wallet/top-up, /generations) require an
 * `Idempotency-Key` header. The owning module stores it under a unique index, so a retried
 * request returns the first result instead of acting twice.
 */
export const requireIdempotencyKey: RequestHandler = (req, _res, next) => {
  const key = req.get('idempotency-key');
  if (!key) {
    return next(
      new AppError(400, 'idempotency_key_required', 'Idempotency-Key header is required'),
    );
  }
  if (!KEY.test(key)) {
    return next(
      new AppError(
        400,
        'invalid_idempotency_key',
        'Idempotency-Key must be 8-128 characters: letters, digits, - or _',
      ),
    );
  }
  req.idempotencyKey = key;
  next();
};
