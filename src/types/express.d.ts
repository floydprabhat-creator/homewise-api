import type { SessionAuth } from '../utils/auth.js';

declare global {
  namespace Express {
    interface Request {
      auth?: SessionAuth;
    }
  }
}

export {};
