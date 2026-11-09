const rawApiBase = import.meta.env.VITE_API_BASE_URL || '';

export const API_BASE_URL = rawApiBase.replace(/\/$/, '');

export const apiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
};
