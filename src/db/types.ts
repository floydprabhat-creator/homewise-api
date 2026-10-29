import type { db } from './index.js';

export type Database = typeof db;
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];
export type DbClient = Database | Tx;
