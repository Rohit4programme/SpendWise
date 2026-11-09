import React, { createContext, type ReactNode, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface CurrencyContextType {
  currency: string;
  symbol: string;
  format: (amount: number) => string;
  refreshSettings: () => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [currency, setCurrency] = useState('USD');

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.currency) {
          setCurrency(data.currency);
        }
      }
    } catch (error) {
      console.error('Failed to fetch currency settings', error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const symbol = currencySymbols[currency] || '$';

  const format = (amount: number) => {
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, symbol, format, refreshSettings: fetchSettings }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
