import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { ALLOWED_FILE_TYPES, MAX_FILES_PER_ENTRY, SIGNED_URL_TTL_SECONDS } from '../../config/constants.js';
import { logger } from '../../lib/logger.js';
import { storage } from '../../lib/storage/index.js';
import { AppError } from '../../utils/app-error.js';
import type { AuthContext } from '../../utils/auth.js';
import * as attachmentsRepository from './attachments.repository.js';

type AllowedType = (typeof ALLOWED_FILE_TYPES)[number];

const EXTENSIONS: Record<AllowedType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export type CheckedFile = { buffer: Buffer; originalName: string; size: number; contentType: AllowedType };
export type FailedFile = { name: string; reason: string };

const invalidFile = (message: string) =>
  new AppError(400, 'INVALID_FILE', message, { files: message });

/** Only the entry's recorder or the head may change it or its files. */
export function canModify(auth: AuthContext, entry: { recordedBy: string }) {
  return auth.role === 'HEAD' || entry.recordedBy === auth.userId;
}

/**
 * Detects each file's type from its bytes (so a renamed .exe is rejected) and checks the count.
 * Runs before anything is saved, so a bad file rejects the whole request.
 */
export async function checkFiles(files: Express.Multer.File[], alreadyAttached = 0): Promise<CheckedFile[]> {
  if (alreadyAttached + files.length > MAX_FILES_PER_ENTRY) {
    const left = MAX_FILES_PER_ENTRY - alreadyAttached;
    throw invalidFile(
      left > 0 ? `You can attach ${left} more file${left === 1 ? '' : 's'} to this entry` : 'This entry already has 3 files',
    );
  }

  return Promise.all(
    files.map(async (file) => {
      const detected = await fileTypeFromBuffer(file.buffer);
      if (!detected || !(ALLOWED_FILE_TYPES as readonly string[]).includes(detected.mime)) {
        throw invalidFile(`${file.originalname} isn't a JPEG, PNG, WebP or PDF file`);
      }
      return {
        buffer: file.buffer,
        originalName: file.originalname.slice(0, 255),
        size: file.size,
        contentType: detected.mime as AllowedType,
      };
    }),
  );
}

/**
 * Stores already-checked files for an entry. A storage failure doesn't undo the entry: the file is
 * reported in `failed` so the user can retry from the entry's detail view.
 */
export async function storeFiles(auth: AuthContext, transactionId: string, files: CheckedFile[]) {
  const stored = [];
  const failed: FailedFile[] = [];

  for (const file of files) {
    const key = `households/${auth.householdId}/${randomUUID()}.${EXTENSIONS[file.contentType]}`;
    try {
      await storage.put(key, file.buffer, file.contentType);
      stored.push(
        await attachmentsRepository.create({
          householdId: auth.householdId,
          transactionId,
          storageKey: key,
          contentType: file.contentType,
          sizeBytes: file.size,
          originalName: file.originalName,
          uploadedBy: auth.userId,
        }),
      );
    } catch (err) {
      logger.error({ err, transactionId }, 'Storing attachment failed');
      await storage.delete(key).catch(() => undefined);
      failed.push({ name: file.originalName, reason: 'Upload failed. Try again from the entry.' });
    }
  }

  return { attachments: stored, failed };
}

export async function getSignedUrl(auth: AuthContext, id: string) {
  // Scoped by householdId: another household's attachment is a 404.
  const attachment = await attachmentsRepository.findById(auth.householdId, id);
  if (!attachment) throw AppError.notFound('Attachment not found');

  return {
    url: await storage.getSignedUrl(attachment.storageKey, SIGNED_URL_TTL_SECONDS),
    expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
    contentType: attachment.contentType,
    originalName: attachment.originalName,
  };
}

export async function remove(auth: AuthContext, id: string) {
  const attachment = await attachmentsRepository.findById(auth.householdId, id);
  if (!attachment) throw AppError.notFound('Attachment not found');
  if (!canModify(auth, attachment)) throw AppError.forbidden('You can only change your own entries');
  if (attachment.billOccurrenceId) {
    throw new AppError(409, 'BILL_PAYMENT', 'Change this through the bill');
  }

  await storage.delete(attachment.storageKey);
  await attachmentsRepository.remove(auth.householdId, id);
}

/** Storage keys of an entry's files, read before the entry is deleted (its rows cascade). */
export async function listStorageKeys(householdId: string, transactionId: string) {
  const files = await attachmentsRepository.listByTransaction(householdId, transactionId);
  return files.map((f) => f.storageKey);
}

/** Deletes stored files. Failures are logged, not thrown, so the entry can still be deleted. */
export async function deleteKeys(keys: string[]) {
  await Promise.all(
    keys.map((key) => storage.delete(key).catch((err) => logger.error({ err, key }, 'Deleting file failed'))),
  );
}

/** Deletes every stored file of an entry. */
export async function deleteStoredFiles(householdId: string, transactionId: string) {
  await deleteKeys(await listStorageKeys(householdId, transactionId));
}
