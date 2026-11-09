// Input validation helpers

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

export const validatePassword = (password: string): boolean => {
  return !!password && password.length >= 8;
};

export const validateAmount = (amount: any): boolean => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && isFinite(num);
};

export const validateMonth = (month: any): boolean => {
  const num = typeof month === 'string' ? parseInt(month) : month;
  return !isNaN(num) && num >= 1 && num <= 12;
};

export const validateYear = (year: any): boolean => {
  const num = typeof year === 'string' ? parseInt(year) : year;
  return !isNaN(num) && num >= 1900 && num <= 2100;
};

export const validateTransactionType = (type: string): boolean => {
  return ['EXPENSE', 'INCOME'].includes(type);
};

export const validateCategoryType = (type: string): boolean => {
  return ['EXPENSE', 'INCOME'].includes(type);
};

export const validateDebtType = (type: string): boolean => {
  return ['LENT', 'BORROWED'].includes(type);
};

export const validateReminderDays = (days: any): boolean => {
  const num = typeof days === 'string' ? parseInt(days) : days;
  return !isNaN(num) && num >= 1 && num <= 365;
};

export const parseAmount = (amount: any): number => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num;
};
