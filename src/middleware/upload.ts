import multer from 'multer';
import { MAX_FILE_BYTES, MAX_FILES_PER_ENTRY } from '../config/constants.js';

/** Files stay in memory: they're type-checked from their bytes before anything is stored. */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_ENTRY },
});
