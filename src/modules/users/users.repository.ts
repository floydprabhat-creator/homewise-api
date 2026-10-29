import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, type NewUser } from '../../db/schema/index.js';
import type { DbClient } from '../../db/types.js';

export async function findByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

export async function findById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function create(data: Pick<NewUser, 'name' | 'email' | 'passwordHash'>, client: DbClient = db) {
  const [user] = await client.insert(users).values(data).returning();
  return user!;
}
