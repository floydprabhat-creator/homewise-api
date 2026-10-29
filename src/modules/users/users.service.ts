import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { SIGNED_URL_TTL_SECONDS } from '../../config/constants.js';
import { sendEmail } from '../../lib/email/index.js';
import { passwordChangedEmail, passwordCodeEmail } from '../../lib/email/templates/account.js';
import { logger } from '../../lib/logger.js';
import { comparePassword, hashPassword } from '../../lib/password.js';
import { storage } from '../../lib/storage/index.js';
import { hashToken } from '../../lib/tokens.js';
import { AppError } from '../../utils/app-error.js';
import * as authService from '../auth/auth.service.js';
import * as householdsRepository from '../households/households.repository.js';
import * as passwordCodesRepository from './password-codes.repository.js';
import type { ChangePasswordInput, UpdateProfileInput } from './users.schemas.js';
import * as usersRepository from './users.repository.js';

const CODE_TTL_MINUTES = 10;
const CODE_MAX_ATTEMPTS = 5;
const CODE_RESEND_SECONDS = 60;

const AVATAR_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;

const codeHash = (userId: string, code: string) => hashToken(`password-code:${userId}:${code}`);

async function findUser(userId: string) {
  const user = await usersRepository.findById(userId);
  if (!user) throw AppError.unauthorized();
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  await usersRepository.updateName(userId, input.name);
  return authService.getSessionContext(userId);
}

/** Replaces the profile photo. The type is checked from the bytes; the old file is deleted afterwards. */
export async function setAvatar(userId: string, file: Express.Multer.File | undefined) {
  if (!file) throw AppError.badRequest('Choose a photo', { avatar: 'Choose a photo' });
  const detected = await fileTypeFromBuffer(file.buffer);
  const extension = detected && AVATAR_TYPES[detected.mime as keyof typeof AVATAR_TYPES];
  if (!extension) throw AppError.badRequest('Use a JPG, PNG or WebP image', { avatar: 'Use a JPG, PNG or WebP image' });

  const previous = (await findUser(userId)).avatarKey;
  const key = `users/${userId}/${randomUUID()}.${extension}`;
  await storage.put(key, file.buffer, detected!.mime);
  await usersRepository.setAvatarKey(userId, key);
  if (previous) await storage.delete(previous).catch((err) => logger.error({ err, key: previous }, 'Deleting old photo failed'));

  return authService.getSessionContext(userId);
}

export async function removeAvatar(userId: string) {
  const previous = (await findUser(userId)).avatarKey;
  await usersRepository.setAvatarKey(userId, null);
  if (previous) await storage.delete(previous).catch((err) => logger.error({ err, key: previous }, 'Deleting photo failed'));
  return authService.getSessionContext(userId);
}

/** A short-lived signed URL for someone's photo: your own, or that of someone in your household. */
export async function avatarLocation(viewer: { userId: string; householdId: string | null }, userId: string) {
  const sameHousehold =
    userId === viewer.userId ||
    (viewer.householdId !== null && Boolean(await householdsRepository.findActiveMember(viewer.householdId, userId)));
  const user = sameHousehold ? await usersRepository.findById(userId) : undefined;
  if (!user?.avatarKey) throw AppError.notFound('No photo');
  return storage.getSignedUrl(user.avatarKey, SIGNED_URL_TTL_SECONDS);
}

/** Emails a 6-digit code (10 minutes, one per minute) for changing the password without the current one. */
export async function sendPasswordCode(userId: string) {
  const user = await findUser(userId);
  const latest = await passwordCodesRepository.findLatest(userId);
  if (latest && Date.now() - latest.createdAt.getTime() < CODE_RESEND_SECONDS * 1000) {
    throw new AppError(429, 'TOO_MANY_REQUESTS', 'A code was just sent. Wait a minute before asking for another.');
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);
  await passwordCodesRepository.create({ userId, codeHash: codeHash(userId, code), expiresAt });
  try {
    await sendEmail(passwordCodeEmail(user.email, user.name.split(' ')[0]!, code, CODE_TTL_MINUTES));
  } catch (err) {
    logger.error({ err, userId }, 'Sending password code failed');
    throw new AppError(503, 'EMAIL_FAILED', "The code couldn't be sent. Try again in a minute.");
  }
  return { sentTo: user.email, expiresAt };
}

async function assertCode(userId: string, code: string) {
  const row = await passwordCodesRepository.findUsable(userId, new Date());
  if (!row) throw AppError.badRequest('This code has expired or was already used. Request a new one.', { code: 'Request a new code' });
  if (row.attempts >= CODE_MAX_ATTEMPTS) {
    throw AppError.badRequest('Too many wrong tries. Request a new code.', { code: 'Request a new code' });
  }
  const given = Buffer.from(codeHash(userId, code));
  if (!timingSafeEqual(given, Buffer.from(row.codeHash))) {
    await passwordCodesRepository.recordAttempt(row.id);
    throw AppError.badRequest("That code isn't right", { code: "That code isn't right" });
  }
  if (!(await passwordCodesRepository.markUsed(row.id))) {
    throw AppError.badRequest('This code was already used. Request a new one.', { code: 'Request a new code' });
  }
}

/**
 * Changes the password after checking the current one or an emailed code. Every other session is
 * signed out (requireAuth rejects tokens issued earlier); the caller gets a fresh one.
 */
export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await findUser(userId);

  if (input.currentPassword !== undefined) {
    if (!(await comparePassword(input.currentPassword, user.passwordHash))) {
      throw AppError.badRequest('Your current password is not right', { currentPassword: 'Not your current password' });
    }
  } else {
    await assertCode(userId, input.code!);
  }
  if (await comparePassword(input.newPassword, user.passwordHash)) {
    throw AppError.badRequest('Choose a password you are not already using', { newPassword: 'Same as your current password' });
  }

  await usersRepository.updatePassword(userId, await hashPassword(input.newPassword), new Date());
  await sendEmail(passwordChangedEmail(user.email, user.name.split(' ')[0]!)).catch((err) =>
    logger.error({ err, userId }, 'Sending password-changed email failed'),
  );
}
