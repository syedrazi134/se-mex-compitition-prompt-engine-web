import { z } from 'zod';

/** A MongoDB ObjectId in its 24-character hex form, as used in URLs. */
export const ObjectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'must be a 24-character hex id')
  .meta({ description: 'MongoDB ObjectId', example: '6730a1f2c9e77a0012ab34cd' });

export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}
