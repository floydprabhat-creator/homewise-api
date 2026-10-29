import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { closeDb, db } from './index.js';

await migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations applied');
await closeDb();
