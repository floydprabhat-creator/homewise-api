import { db } from './index.js';
import type { Tx } from './types.js';

export function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
