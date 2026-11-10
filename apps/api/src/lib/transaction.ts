import mongoose, { type ClientSession } from 'mongoose';

/**
 * Runs `work` in a MongoDB transaction (requires a replica set). Retries transient errors as the
 * driver recommends. Every write inside must pass `session`.
 */
export async function withTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
