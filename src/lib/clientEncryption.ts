/**
 * Client-side encryption layer for E2E encryption
 * Handles encryption/decryption of sensitive data before API calls
 * Derived encryption key is stored in sessionStorage (cleared on logout)
 */

import {
  deriveEncryptionKey,
  encryptData,
  decryptData,
  encryptNumber,
  decryptNumber,
  encryptObject,
  decryptObject,
} from './encryption';

const ENCRYPTION_KEY_STORAGE_KEY = 'spendwise_encryption_key';
const ENCRYPTION_SALT_STORAGE_KEY = 'spendwise_encryption_salt';

/**
 * Initialize encryption with password on login
 * Stores derived key in sessionStorage
 * @param password - User's password
 * @param salt - Encryption salt from server
 */
export function initializeEncryption(password: string, salt: string): void {
  try {
    const derivedKey = deriveEncryptionKey(password, salt);
    sessionStorage.setItem(ENCRYPTION_KEY_STORAGE_KEY, derivedKey);
    sessionStorage.setItem(ENCRYPTION_SALT_STORAGE_KEY, salt);
  } catch (error) {
    console.error('Failed to initialize encryption:', error);
    throw error;
  }
}

/**
 * Get stored encryption key from sessionStorage
 * @returns Base64-encoded encryption key
 */
export function getEncryptionKey(): string {
  const key = sessionStorage.getItem(ENCRYPTION_KEY_STORAGE_KEY);
  if (!key) {
    throw new Error('Encryption key not initialized. Please log in again.');
  }
  return key;
}

/**
 * Get stored encryption salt from sessionStorage
 * @returns Base64-encoded salt
 */
export function getEncryptionSalt(): string {
  const salt = sessionStorage.getItem(ENCRYPTION_SALT_STORAGE_KEY);
  if (!salt) {
    throw new Error('Encryption salt not initialized. Please log in again.');
  }
  return salt;
}

/**
 * Clear encryption key from sessionStorage (called on logout)
 */
export function clearEncryption(): void {
  sessionStorage.removeItem(ENCRYPTION_KEY_STORAGE_KEY);
  sessionStorage.removeItem(ENCRYPTION_SALT_STORAGE_KEY);
}

/**
 * Check if encryption is initialized
 */
export function isEncryptionInitialized(): boolean {
  return sessionStorage.getItem(ENCRYPTION_KEY_STORAGE_KEY) !== null;
}

// ===== Encryption Wrappers =====

export function encryptAmount(amount: number): string {
  const key = getEncryptionKey();
  return encryptNumber(amount, key);
}

export function decryptAmount(encrypted: string): number {
  const key = getEncryptionKey();
  return decryptNumber(encrypted, key);
}

export function encryptDescription(description: string): string {
  const key = getEncryptionKey();
  return encryptData(description, key);
}

export function decryptDescription(encrypted: string): string {
  const key = getEncryptionKey();
  return decryptData(encrypted, key);
}

export function encryptCategoryName(name: string): string {
  const key = getEncryptionKey();
  return encryptData(name, key);
}

export function decryptCategoryName(encrypted: string): string {
  const key = getEncryptionKey();
  return decryptData(encrypted, key);
}

export function encryptDueDate(date: string | Date): string {
  const key = getEncryptionKey();
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  return encryptData(dateStr, key);
}

export function decryptDueDate(encrypted: string): string {
  const key = getEncryptionKey();
  return decryptData(encrypted, key);
}

/**
 * Encrypt multiple numeric fields at once
 * Useful for budgets, debts, repayments with multiple amount fields
 */
export function encryptNumericFields(fields: Record<string, number>): Record<string, string> {
  const key = getEncryptionKey();
  const result: Record<string, string> = {};
  for (const [fieldName, value] of Object.entries(fields)) {
    result[`encrypted${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`] = encryptNumber(
      value,
      key
    );
  }
  return result;
}

/**
 * Decrypt multiple encrypted numeric fields at once
 */
export function decryptNumericFields(fields: Record<string, string>): Record<string, number> {
  const key = getEncryptionKey();
  const result: Record<string, number> = {};
  for (const [fieldName, encrypted] of Object.entries(fields)) {
    // Convert encryptedFieldName back to fieldName
    const originalName = fieldName
      .replace('encrypted', '')
      .replace(/^./, (char) => char.toLowerCase());
    result[originalName] = decryptNumber(encrypted, key);
  }
  return result;
}

/**
 * Encrypt an entire object (for complex nested data)
 */
export function encryptPayload(obj: Record<string, any>): string {
  const key = getEncryptionKey();
  return encryptObject(obj, key);
}

/**
 * Decrypt an encrypted payload
 */
export function decryptPayload<T = Record<string, any>>(encrypted: string): T {
  const key = getEncryptionKey();
  return decryptObject<T>(encrypted, key);
}

/**
 * Prepare transaction data for API POST/PUT
 * Encrypts amount and description, keeps other fields plain
 */
export function encryptTransactionData(transaction: any) {
  return {
    ...transaction,
    encryptedAmount: transaction.amount ? encryptAmount(transaction.amount) : undefined,
    encryptedDescription: transaction.description ? encryptDescription(transaction.description) : undefined,
    amount: undefined,
    description: undefined,
  };
}

/**
 * Prepare transaction for display (decrypt encrypted fields)
 */
export function decryptTransactionData(transaction: any) {
  return {
    ...transaction,
    amount: transaction.encryptedAmount ? decryptAmount(transaction.encryptedAmount) : transaction.amount,
    description: transaction.encryptedDescription ? decryptDescription(transaction.encryptedDescription) : transaction.description,
  };
}

/**
 * Prepare budget data for API POST/PUT
 */
export function encryptBudgetData(budget: any) {
  return {
    ...budget,
    encryptedLimit: budget.limit ? encryptAmount(budget.limit) : undefined,
    encryptedSpent: budget.spent ? encryptAmount(budget.spent) : undefined,
    limit: undefined,
    spent: undefined,
  };
}

/**
 * Decrypt budget for display
 */
export function decryptBudgetData(budget: any) {
  return {
    ...budget,
    limit: budget.encryptedLimit ? decryptAmount(budget.encryptedLimit) : budget.limit,
    spent: budget.encryptedSpent ? decryptAmount(budget.encryptedSpent) : budget.spent,
  };
}

/**
 * Prepare debt data for API POST/PUT
 */
export function encryptDebtData(debt: any) {
  return {
    ...debt,
    encryptedAmount: debt.amount ? encryptAmount(debt.amount) : undefined,
    encryptedNotes: debt.notes ? encryptDescription(debt.notes) : undefined,
    amount: undefined,
    notes: undefined,
  };
}

/**
 * Decrypt debt for display
 */
export function decryptDebtData(debt: any) {
  return {
    ...debt,
    amount: debt.encryptedAmount ? decryptAmount(debt.encryptedAmount) : debt.amount,
    notes: debt.encryptedNotes ? decryptDescription(debt.encryptedNotes) : debt.notes,
  };
}

/**
 * Prepare bill data for API POST/PUT
 */
export function encryptBillData(bill: any) {
  return {
    ...bill,
    encryptedAmount: bill.amount ? encryptAmount(bill.amount) : undefined,
    encryptedDueDate: bill.dueDate ? encryptDueDate(bill.dueDate) : undefined,
    amount: undefined,
    dueDate: undefined,
  };
}

/**
 * Decrypt bill for display
 */
export function decryptBillData(bill: any) {
  return {
    ...bill,
    amount: bill.encryptedAmount ? decryptAmount(bill.encryptedAmount) : bill.amount,
    dueDate: bill.encryptedDueDate ? decryptDueDate(bill.encryptedDueDate) : bill.dueDate,
  };
}
