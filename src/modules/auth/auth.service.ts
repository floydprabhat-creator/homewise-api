import { withTransaction } from '../../db/transaction.js';
import { comparePassword, hashPassword } from '../../lib/password.js';
import type { User } from '../../db/schema/index.js';
import { AppError } from '../../utils/app-error.js';
import type { SessionAuth } from '../../utils/auth.js';
import { isUniqueViolation } from '../../utils/db-errors.js';
import * as householdsRepository from '../households/households.repository.js';
import * as invitesService from '../invites/invites.service.js';
import * as usersRepository from '../users/users.repository.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

type Membership = Awaited<ReturnType<typeof householdsRepository.findActiveMembership>>;

export type SessionContext = {
  user: { id: string; name: string; email: string; createdAt: Date };
  household: { id: string; name: string; type: 'PERSONAL' | 'FAMILY' } | null;
  role: 'HEAD' | 'MEMBER' | null;
  needsOnboarding: boolean;
};

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
const emailTaken = () => AppError.conflict('An account with this email already exists', { email: 'This email is already registered' });

// Compared against when the email is unknown, so both failure paths take the same time.
const DUMMY_HASH = '$2b$12$GmIJjUL3Q6BtpHzRscbPk.sZ4O1TK4SAEn/yP1iXOTpNjPymVqoxa';

function toSessionContext(user: User, membership: Membership): SessionContext {
  return {
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    household: membership?.household ?? null,
    role: membership?.role ?? null,
    needsOnboarding: !membership,
  };
}

export async function register(input: RegisterInput): Promise<SessionContext> {
  if (await usersRepository.findByEmail(input.email)) throw emailTaken();

  const passwordHash = await hashPassword(input.password);

  try {
    const data = { name: input.name, email: input.email, passwordHash };
    if (!input.inviteToken) return toSessionContext(await usersRepository.create(data), undefined);

    // Signing up from an invite: the account and the membership are created together, or neither is.
    const user = await withTransaction(async (tx) => {
      const created = await usersRepository.create(data, tx);
      await invitesService.acceptForNewUser(input.inviteToken!, created, tx);
      return created;
    });
    return toSessionContext(user, await householdsRepository.findActiveMembership(user.id));
  } catch (err) {
    // Two signups with the same email at the same moment: the unique index rejects the second.
    if (isUniqueViolation(err, 'users_email_idx')) throw emailTaken();
    throw err;
  }
}

export async function login(input: LoginInput): Promise<SessionContext> {
  const user = await usersRepository.findByEmail(input.email);
  const passwordOk = await comparePassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) throw invalidCredentials();

  const membership = await householdsRepository.findActiveMembership(user.id);
  return toSessionContext(user, membership);
}

export async function getSessionContext(userId: string): Promise<SessionContext> {
  const [user, membership] = await Promise.all([
    usersRepository.findById(userId),
    householdsRepository.findActiveMembership(userId),
  ]);
  if (!user) throw AppError.unauthorized();
  return toSessionContext(user, membership);
}

/** Used by requireAuth on every request. Returns null when the user no longer exists. */
export async function resolveSession(userId: string): Promise<SessionAuth | null> {
  const [user, membership] = await Promise.all([
    usersRepository.findById(userId),
    householdsRepository.findActiveMembership(userId),
  ]);
  if (!user) return null;
  return { userId, householdId: membership?.household.id ?? null, role: membership?.role ?? null };
}
