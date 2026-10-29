import { INVITE_TTL_DAYS, MAX_HOUSEHOLD_MEMBERS } from '../../config/constants.js';
import { env } from '../../config/env.js';
import { withTransaction } from '../../db/transaction.js';
import type { DbClient } from '../../db/types.js';
import { sendEmail } from '../../lib/email/index.js';
import { inviteEmail } from '../../lib/email/templates/invite.js';
import { logger } from '../../lib/logger.js';
import { generateToken, hashToken } from '../../lib/tokens.js';
import { AppError } from '../../utils/app-error.js';
import type { AuthContext } from '../../utils/auth.js';
import { isUniqueViolation } from '../../utils/db-errors.js';
import { formatDay } from '../../utils/format.js';
import * as householdsRepository from '../households/households.repository.js';
import { notify } from '../notifications/notify.js';
import * as usersRepository from '../users/users.repository.js';
import * as invitesRepository from './invites.repository.js';
import type { AcceptInviteInput, CreateInviteInput } from './invites.schemas.js';

type InviteStatusView = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

const expiryFromNow = () => new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

/** The daily job marks EXPIRED; until it runs, a PENDING invite past its expiry is treated as expired. */
const effectiveStatus = (i: { status: InviteStatusView; expiresAt: Date }): InviteStatusView =>
  i.status === 'PENDING' && i.expiresAt <= new Date() ? 'EXPIRED' : i.status;

const duplicateInvite = () =>
  AppError.conflict('There is already a pending invite for this email', { email: 'Already invited' });
const familyFull = () =>
  AppError.conflict(`A family can have up to ${MAX_HOUSEHOLD_MEMBERS} members, including pending invites`, {
    email: 'Family is full',
  });

const NOT_USABLE: Record<Exclude<InviteStatusView, 'PENDING'>, () => AppError> = {
  EXPIRED: () => new AppError(410, 'INVITE_EXPIRED', 'This invite has expired. Ask the head of the family to send a new one.'),
  REVOKED: () => new AppError(410, 'INVITE_REVOKED', 'This invite was cancelled by the head of the family.'),
  ACCEPTED: () => new AppError(409, 'INVITE_USED', 'This invite has already been used.'),
};

async function sendInvite(auth: AuthContext, email: string, token: string, expiresAt: Date) {
  const [household, inviter] = await Promise.all([
    householdsRepository.findById(auth.householdId),
    usersRepository.findById(auth.userId),
  ]);
  const message = inviteEmail({
    to: email,
    inviterName: inviter?.name ?? 'Your family',
    familyName: household?.name ?? 'their family',
    link: `${env.APP_URL}/invite/${token}`,
    expiresOn: formatDay(expiresAt.toISOString().slice(0, 10)),
  });
  // The invite is saved either way; a failed send can be retried with Resend.
  await sendEmail(message).catch((err) => logger.error({ err, to: email }, 'Sending invite email failed'));
}

async function assertFamily(householdId: string) {
  const household = await householdsRepository.findById(householdId);
  if (household?.type !== 'FAMILY') {
    throw AppError.conflict('Turn your household into a family before inviting members');
  }
}

export async function list(auth: AuthContext) {
  const rows = await invitesRepository.listPending(auth.householdId);
  return rows.map((r) => ({ ...r, status: effectiveStatus(r) }));
}

export async function create(auth: AuthContext, input: CreateInviteInput) {
  await assertFamily(auth.householdId);

  const user = await usersRepository.findByEmail(input.email);
  if (user && (await householdsRepository.findActiveMember(auth.householdId, user.id))) {
    throw AppError.conflict('This person is already in your family', { email: 'Already a member' });
  }
  const pending = await invitesRepository.findPendingByEmail(auth.householdId, input.email);
  if (pending && pending.expiresAt > new Date()) throw duplicateInvite();

  const [members, invited] = await Promise.all([
    householdsRepository.countActiveMembers(auth.householdId),
    invitesRepository.countPending(auth.householdId, new Date()),
  ]);
  if (members + invited >= MAX_HOUSEHOLD_MEMBERS) throw familyFull();

  // A PENDING row past its expiry (the daily job hasn't run yet) gets a fresh link instead.
  if (pending) return resend(auth, pending.id);

  const token = generateToken();
  const expiresAt = expiryFromNow();
  let invite;
  try {
    invite = await invitesRepository.create({
      householdId: auth.householdId,
      email: input.email,
      tokenHash: hashToken(token),
      invitedBy: auth.userId,
      expiresAt,
    });
  } catch (err) {
    if (isUniqueViolation(err, 'invites_household_email_pending_idx')) throw duplicateInvite();
    throw err;
  }

  await sendInvite(auth, input.email, token, expiresAt);
  return invite;
}

export async function resend(auth: AuthContext, id: string) {
  const invite = await invitesRepository.findById(auth.householdId, id);
  if (!invite) throw AppError.notFound('Invite not found');
  if (invite.status !== 'PENDING' && invite.status !== 'EXPIRED') {
    throw AppError.conflict('Only pending or expired invites can be resent');
  }

  const token = generateToken();
  const expiresAt = expiryFromNow();
  let refreshed;
  try {
    refreshed = await invitesRepository.refreshToken(auth.householdId, id, hashToken(token), expiresAt);
  } catch (err) {
    if (isUniqueViolation(err, 'invites_household_email_pending_idx')) throw duplicateInvite();
    throw err;
  }
  await sendInvite(auth, invite.email, token, expiresAt);
  return refreshed;
}

export async function revoke(auth: AuthContext, id: string) {
  const invite = await invitesRepository.findById(auth.householdId, id);
  if (!invite) throw AppError.notFound('Invite not found');
  if (invite.status === 'ACCEPTED') throw AppError.conflict('This invite has already been used');
  await invitesRepository.revoke(auth.householdId, id);
}

/** Public: what the invite page shows before anyone logs in. */
export async function preview(token: string) {
  const invite = await invitesRepository.findByTokenHash(hashToken(token));
  if (!invite) throw AppError.notFound('This invite link is not valid. Check that you copied all of it.');
  const status = invite.householdStatus === 'ARCHIVED' ? 'REVOKED' : effectiveStatus(invite);
  return {
    familyName: invite.familyName,
    inviterName: invite.inviterName,
    email: invite.email,
    status,
    expiresAt: invite.expiresAt,
  };
}

/** Finds a usable invite for `email`, or throws the reason it can't be used. */
async function findUsable(token: string, email: string, client?: DbClient) {
  const invite = await invitesRepository.findByTokenHash(hashToken(token), client);
  if (!invite) throw AppError.notFound('This invite link is not valid');
  const status = invite.householdStatus === 'ARCHIVED' ? 'REVOKED' : effectiveStatus(invite);
  if (status !== 'PENDING') throw NOT_USABLE[status]();
  if (invite.email !== email.toLowerCase()) {
    throw new AppError(403, 'EMAIL_MISMATCH', `This invite is for ${invite.email}. Log in with that email to accept it.`);
  }
  return invite;
}

async function joinFamily(invite: Awaited<ReturnType<typeof findUsable>>, userId: string, client: DbClient) {
  const members = await householdsRepository.countActiveMembers(invite.householdId, client);
  if (members >= MAX_HOUSEHOLD_MEMBERS) {
    throw AppError.conflict(`This family already has ${MAX_HOUSEHOLD_MEMBERS} members`);
  }
  // Only flips a PENDING row: the second of two tabs accepting at once gets 409.
  if (!(await invitesRepository.markAccepted(invite.id, userId, client))) throw NOT_USABLE.ACCEPTED();
  await householdsRepository.addMember({ householdId: invite.householdId, userId, role: 'MEMBER' }, client);
}

async function notifyHead(invite: { id: string; householdId: string; invitedBy: string }, name: string, client: DbClient) {
  const headId = (await householdsRepository.findHeadId(invite.householdId)) ?? invite.invitedBy;
  await notify(
    {
      householdId: invite.householdId,
      userId: headId,
      type: 'INVITE_ACCEPTED',
      title: `${name} joined your family`,
      body: `${name} can now record spending and pay bills assigned to them.`,
      link: '/settings/family',
      dedupeKey: `invite_accepted:${invite.id}`,
      email: false,
    },
    client,
  );
}

/** Called by auth.register inside its transaction: the new user joins as MEMBER and skips budget onboarding. */
export async function acceptForNewUser(token: string, user: { id: string; name: string; email: string }, tx: DbClient) {
  const invite = await findUsable(token, user.email, tx);
  await joinFamily(invite, user.id, tx);
  await notifyHead(invite, user.name, tx);
}

/**
 * An existing user joins. Someone without a household joins directly. The head of a household with
 * no other members (usually "Just me") must confirm, and that household is archived. A head with
 * members, or a member of another family, can't accept.
 */
export async function accept(userId: string, token: string, input: AcceptInviteInput) {
  const user = await usersRepository.findById(userId);
  if (!user) throw AppError.unauthorized();
  const invite = await findUsable(token, user.email);

  const membership = await householdsRepository.findActiveMembership(userId);
  if (membership) {
    const current = membership.household;
    if (current.id === invite.householdId) throw AppError.conflict('You are already in this family');
    if (membership.role !== 'HEAD') {
      throw new AppError(409, 'IN_ANOTHER_FAMILY', `You're a member of ${current.name}. Leave it before joining another family.`);
    }
    if ((await householdsRepository.countActiveMembers(current.id)) > 1) {
      throw new AppError(409, 'HEADS_FAMILY', `You head ${current.name}, which has other members, so you can't join another family.`);
    }
    if (!input.confirmArchivePersonal) {
      throw new AppError(
        409,
        'CONFIRM_ARCHIVE_PERSONAL',
        `Joining ${invite.familyName} archives your own household, ${current.name}. Its budget, spending and bills will no longer be shown.`,
      );
    }
  }

  await withTransaction(async (tx) => {
    if (membership) {
      await householdsRepository.archive(membership.household.id, tx);
      await householdsRepository.removeMember(membership.household.id, userId, tx);
    }
    await joinFamily(invite, userId, tx);
    await notifyHead(invite, user.name, tx);
  });
}

/** Daily job (F9 schedules it). */
export async function expireOld(now = new Date()) {
  return { expired: await invitesRepository.expireOld(now) };
}
