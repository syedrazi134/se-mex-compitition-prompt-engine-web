import type { DependencyStatus } from '@prompt-engine/shared-types';
import mongoose, { type Connection } from 'mongoose';
import { withTimeout } from './timeout.js';

const CHECK_TIMEOUT_MS = 2_000;

export async function connectMongo(uri: string): Promise<Connection> {
  mongoose.set('strict', true);
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
  return mongoose.connection;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * `ok` only when connected AND part of a replica set: orders, ledger and payouts need
 * multi-document transactions, which a standalone server does not support.
 */
export async function checkMongo(
  connection: Connection = mongoose.connection,
): Promise<DependencyStatus> {
  if (connection.readyState !== mongoose.ConnectionStates.connected || !connection.db)
    return 'down';
  try {
    const hello = await withTimeout(
      connection.db.admin().command({ hello: 1 }),
      CHECK_TIMEOUT_MS,
      'mongodb hello',
    );
    return typeof hello.setName === 'string' && hello.setName.length > 0 ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}
