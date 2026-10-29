import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../config/constants.js';

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);

export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);
