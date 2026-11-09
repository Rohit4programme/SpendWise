import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  generateSalt,
  generateRecoveryKey,
  deriveEncryptionKey,
  encryptRecoveryKey,
} from './encryption';

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
};

export interface UserPayload {
  id: string;
  email: string;
}

export interface EncryptionSetup {
  salt: string;
  recoveryKeyEncrypted: string;
}

export const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};

export const generateToken = (user: UserPayload) => {
  return jwt.sign(user, getJWTSecret(), { expiresIn: '7d' });
};

export const verifyToken = (token: string): UserPayload | null => {
  try {
    return jwt.verify(token, getJWTSecret()) as UserPayload;
  } catch (error) {
    return null;
  }
};

export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const compareResetToken = (token: string, hash: string): boolean => {
  if (!token || !hash || token.length !== hash.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(hash));
};

/**
 * Sets up encryption for a new user
 * Generates salt, derives key from password, generates recovery key
 * @param password - User's password
 * @returns Encryption setup with salt and encrypted recovery key
 */
export const setupEncryption = (password: string): EncryptionSetup => {
  const salt = generateSalt();
  const derivedKey = deriveEncryptionKey(password, salt);
  const recoveryKey = generateRecoveryKey();
  const recoveryKeyEncrypted = encryptRecoveryKey(recoveryKey, derivedKey);

  return {
    salt,
    recoveryKeyEncrypted,
  };
};

/**
 * Derives encryption key from password for login
 * This enables the client to decrypt user's data
 * @param password - User's password
 * @param salt - User's encryption salt (retrieved from DB)
 * @returns Derived encryption key (base64)
 */
export const deriveKeyFromPassword = (password: string, salt: string): string => {
  return deriveEncryptionKey(password, salt);
};

