import crypto from 'crypto';

// Configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 310000; // OWASP recommended

/**
 * Derives an encryption key from a password using PBKDF2
 * @param password - User password
 * @param salt - Random salt (base64 string)
 * @returns Base64-encoded encryption key
 */
export function deriveEncryptionKey(
  password: string,
  salt: string
): string {
  const saltBuffer = Buffer.from(salt, 'base64');
  const derivedKey = crypto.pbkdf2Sync(
    password,
    saltBuffer,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
  return derivedKey.toString('base64');
}

/**
 * Generates a random encryption salt
 * @returns Base64-encoded salt
 */
export function generateSalt(): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  return salt.toString('base64');
}

/**
 * Encrypts data using AES-256-GCM
 * @param plaintext - Data to encrypt (string)
 * @param keyBase64 - Encryption key (base64-encoded)
 * @returns Base64-encoded encrypted data (iv:ciphertext:authTag)
 */
export function encryptData(plaintext: string, keyBase64: string): string {
  try {
    const key = Buffer.from(keyBase64, 'base64');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:ciphertext:authTag (all base64)
    const encryptedData = `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
    return encryptedData;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decrypts data using AES-256-GCM
 * @param encryptedBase64 - Encrypted data in format: iv:ciphertext:authTag (all base64)
 * @param keyBase64 - Encryption key (base64-encoded)
 * @returns Decrypted plaintext (string)
 */
export function decryptData(encryptedBase64: string, keyBase64: string): string {
  try {
    const [ivBase64, ciphertextHex, authTagBase64] = encryptedBase64.split(':');
    
    if (!ivBase64 || !ciphertextHex || !authTagBase64) {
      throw new Error('Invalid encrypted data format');
    }

    const key = Buffer.from(keyBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Encrypts a number (converts to string first)
 * @param value - Numeric value to encrypt
 * @param keyBase64 - Encryption key (base64-encoded)
 * @returns Encrypted data (base64)
 */
export function encryptNumber(value: number, keyBase64: string): string {
  return encryptData(value.toString(), keyBase64);
}

/**
 * Decrypts a number
 * @param encryptedBase64 - Encrypted data
 * @param keyBase64 - Encryption key (base64-encoded)
 * @returns Decrypted numeric value
 */
export function decryptNumber(encryptedBase64: string, keyBase64: string): number {
  const decrypted = decryptData(encryptedBase64, keyBase64);
  const parsed = parseFloat(decrypted);
  if (isNaN(parsed)) {
    throw new Error('Decrypted value is not a valid number');
  }
  return parsed;
}

/**
 * Encrypts a JSON object
 * @param obj - Object to encrypt
 * @param keyBase64 - Encryption key (base64-encoded)
 * @returns Encrypted JSON (base64)
 */
export function encryptObject(obj: Record<string, any>, keyBase64: string): string {
  return encryptData(JSON.stringify(obj), keyBase64);
}

/**
 * Decrypts a JSON object
 * @param encryptedBase64 - Encrypted data
 * @param keyBase64 - Encryption key (base64-encoded)
 * @returns Decrypted object
 */
export function decryptObject<T = Record<string, any>>(
  encryptedBase64: string,
  keyBase64: string
): T {
  const decrypted = decryptData(encryptedBase64, keyBase64);
  return JSON.parse(decrypted) as T;
}

/**
 * Generates a random recovery key (32 alphanumeric characters)
 * Can be used as a backup encryption key or recovery code
 * @returns Random recovery key (base64)
 */
export function generateRecoveryKey(): string {
  const recoveryKey = crypto.randomBytes(32);
  return recoveryKey.toString('base64');
}

/**
 * Creates a recovery key encrypted with the main encryption key
 * This allows account recovery if password is lost
 * @param recoveryKey - The recovery key to encrypt
 * @param masterKeyBase64 - Master encryption key (derived from password)
 * @returns Encrypted recovery key (base64)
 */
export function encryptRecoveryKey(recoveryKey: string, masterKeyBase64: string): string {
  return encryptData(recoveryKey, masterKeyBase64);
}

/**
 * Decrypts and retrieves the recovery key
 * @param encryptedRecoveryKeyBase64 - Encrypted recovery key
 * @param masterKeyBase64 - Master encryption key (derived from password)
 * @returns Decrypted recovery key
 */
export function decryptRecoveryKey(
  encryptedRecoveryKeyBase64: string,
  masterKeyBase64: string
): string {
  return decryptData(encryptedRecoveryKeyBase64, masterKeyBase64);
}

/**
 * Validates encryption key format (should be base64 string)
 * @param key - Key to validate
 * @returns true if valid, false otherwise
 */
export function isValidEncryptionKey(key: string): boolean {
  try {
    const buf = Buffer.from(key, 'base64');
    return buf.length === KEY_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Validates salt format
 * @param salt - Salt to validate
 * @returns true if valid, false otherwise
 */
export function isValidSalt(salt: string): boolean {
  try {
    const buf = Buffer.from(salt, 'base64');
    return buf.length === SALT_LENGTH;
  } catch {
    return false;
  }
}
