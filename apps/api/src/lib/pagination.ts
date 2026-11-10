import { z } from 'zod';
import { AppError } from './errors.js';

/** Lists use cursor pagination (`?cursor=&limit=`), never page numbers. */
export const PaginationQuerySchema = z.object({
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export type CursorValue = Record<string, string | number>;

const CursorValueSchema = z.record(z.string(), z.union([z.string(), z.number()]));

/** Opaque to clients: base64url-encoded JSON of the sort keys of the last item returned. */
export function encodeCursor(value: CursorValue): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): CursorValue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new AppError(400, 'invalid_cursor', 'Cursor is not valid');
  }
  const result = CursorValueSchema.safeParse(parsed);
  if (!result.success) throw new AppError(400, 'invalid_cursor', 'Cursor is not valid');
  return result.data;
}
