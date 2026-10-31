export const SESSION_COOKIE = 'hw_session';
export const SESSION_TTL_DAYS = 7;
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const BCRYPT_COST = 12;

export const LOGIN_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 5 };
export const REGISTER_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 10 };
export const PASSWORD_RESET_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 10 };

export const INVITE_TTL_DAYS = 7;
export const MAX_HOUSEHOLD_MEMBERS = 10;

export const TIMEZONE = 'Asia/Kolkata';
export const PAGE_SIZE = 20;

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_ENTRY = 3;
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const SIGNED_URL_TTL_SECONDS = 5 * 60;

/** Bill scans per household per day, so a bug or misuse can't exhaust the AI quota. */
export const BILL_SCANS_PER_DAY = 50;
