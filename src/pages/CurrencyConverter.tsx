import { ChangeEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { exchangeRateService, currencyFlags } from '../services/exchangeRateService';
import { ArrowRightLeft, TrendingUp, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import StockMarketInsights from '../components/stocks/StockMarketInsights';

export default function CurrencyConverter() {
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [fromAmount, setFromAmount] = useState('1');
  const [toAmount, setToAmount] = useState('0.92');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(0.92);
  const [error, setError] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [fromSearchQuery, setFromSearchQuery] = useState('');
  const [toSearchQuery, setToSearchQuery] = useState('');
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);

  // Fetch supported currencies on mount
  useEffect(() => {
    const fetchCurrencies = async () => {
      const supportedCurrencies = await exchangeRateService.getSupportedCurrencies();
      setCurrencies(supportedCurrencies);
    };
    fetchCurrencies();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-currency-dropdown]')) {
        setIsFromOpen(false);
        setIsToOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch exchange rate on currency change
  useEffect(() => {
    const fetchRate = async () => {
      setLoading(true);
      setError(null);
      try {
        const rate = await exchangeRateService.convertCurrency(1, fromCurrency, toCurrency);
        setExchangeRate(rate);
        setLastUpdated(new Date());

        // Update the to amount
        const converted = await exchangeRateService.convertCurrency(
          parseFloat(fromAmount) || 0,
          fromCurrency,
          toCurrency
        );
        setToAmount(converted.toFixed(2));
      } catch (err) {
        setError('Failed to fetch exchange rate. Using cached rate.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, [fromCurrency, toCurrency]);

  // Handle amount change
  const handleFromAmountChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromAmount(value);

    if (!value || isNaN(parseFloat(value))) {
      setToAmount('0');
      return;
    }

    try {
      const converted = await exchangeRateService.convertCurrency(
        parseFloat(value),
        fromCurrency,
        toCurrency
      );
      setToAmount(converted.toFixed(2));
    } catch (err) {
      setError('Conversion failed');
      console.error(err);
    }
  };

  const handleToAmountChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToAmount(value);

    if (!value || isNaN(parseFloat(value))) {
      setFromAmount('0');
      return;
    }

    try {
      const converted = await exchangeRateService.convertCurrency(
        parseFloat(value),
        toCurrency,
        fromCurrency
      );
      setFromAmount(converted.toFixed(2));
    } catch (err) {
      setError('Conversion failed');
      console.error(err);
    }
  };

  // Filter currencies based on search query
  const filterCurrencies = (query: string, currencyList: string[]) => {
    if (!query) return currencyList;
    const lowerQuery = query.toLowerCase();
    return currencyList.filter((curr) => {
      const flags = currencyFlags[curr];
      return (
        curr.toLowerCase().includes(lowerQuery) ||
        (flags?.country && flags.country.toLowerCase().includes(lowerQuery)) ||
        (flags?.flag && flags.flag.includes(query))
      );
    });
  };

  const filteredFromCurrencies = filterCurrencies(fromSearchQuery, currencies);
  const filteredToCurrencies = filterCurrencies(toSearchQuery, currencies);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const refreshRate = async () => {
    setLoading(true);
    setError(null);
    try {
      const rate = await exchangeRateService.convertCurrency(1, fromCurrency, toCurrency);
      setExchangeRate(rate);
      setLastUpdated(new Date());

      const converted = await exchangeRateService.convertCurrency(
        parseFloat(fromAmount) || 0,
        fromCurrency,
        toCurrency
      );
      setToAmount(converted.toFixed(2));
    } catch (err) {
      setError('Failed to refresh exchange rate');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Currency Converter</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Convert currencies in real-time with live exchange rates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Converter */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-neutral-200 dark:border-neutral-800 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Convert Currency</CardTitle>
                <CardDescription>
                  {lastUpdated && (
                    <div className="flex items-center gap-1.5 text-xs mt-2">
                      <Clock className="w-3 h-3" />
                      Updated {lastUpdated.toLocaleTimeString()}
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                    {error}
                  </div>
                )}

                {/* From Currency Section */}
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium">From</Label>
                  <div className="flex gap-3">
                    <div className="flex-1" data-currency-dropdown>
                      <div className="relative pb-5">
                        <Input
                          type="text"
                          placeholder="Search currency..."
                          value={fromSearchQuery}
                          onChange={(e) => {
                            setFromSearchQuery(e.target.value);
                            setIsFromOpen(true);
                          }}
                          onFocus={() => setIsFromOpen(true)}
                          className="h-12 border-neutral-200 dark:border-neutral-700"
                        />
                        {isFromOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 scrollbar-thin">
                            {filteredFromCurrencies.length > 0 ? (
                              filteredFromCurrencies.map((curr) => (
                                <button
                                  key={curr}
                                  onClick={() => {
                                    setFromCurrency(curr);
                                    setFromSearchQuery('');
                                    setIsFromOpen(false);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
                                >
                                  <span>{currencyFlags[curr]?.flag}</span>
                                  <span className="font-medium">{curr}</span>
                                  <span className="text-xs text-neutral-400 ml-auto">
                                    {currencyFlags[curr]?.country}
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-neutral-500 text-center">
                                No currencies found
                              </div>
                            )}
                          </div>
                        )}
                        {fromCurrency && (
                          <div className="absolute -bottom-7 left-0 text-xs text-neutral-500 flex items-center gap-1">
                            <span>{currencyFlags[fromCurrency]?.flag}</span>
                            <span>{fromCurrency}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={fromAmount}
                        onChange={handleFromAmountChange}
                        className="h-12 text-lg font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={swapCurrencies}
                    className="p-3 rounded-full bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800 transition-colors"
                  >
                    <ArrowRightLeft className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </motion.button>
                </div>

                {/* To Currency Section */}
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium">To</Label>
                  <div className="flex gap-3">
                    <div className="flex-1" data-currency-dropdown>
                      <div className="relative pb-5">
                        <Input
                          type="text"
                          placeholder="Search currency..."
                          value={toSearchQuery}
                          onChange={(e) => {
                            setToSearchQuery(e.target.value);
                            setIsToOpen(true);
                          }}
                          onFocus={() => setIsToOpen(true)}
                          className="h-12 border-neutral-200 dark:border-neutral-700"
                        />
                        {isToOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 scrollbar-thin">
                            {filteredToCurrencies.length > 0 ? (
                              filteredToCurrencies.map((curr) => (
                                <button
                                  key={curr}
                                  onClick={() => {
                                    setToCurrency(curr);
                                    setToSearchQuery('');
                                    setIsToOpen(false);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
                                >
                                  <span>{currencyFlags[curr]?.flag}</span>
                                  <span className="font-medium">{curr}</span>
                                  <span className="text-xs text-neutral-400 ml-auto">
                                    {currencyFlags[curr]?.country}
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-neutral-500 text-center">
                                No currencies found
                              </div>
                            )}
                          </div>
                        )}
                        {toCurrency && (
                          <div className="absolute -bottom-7 left-0 text-xs text-neutral-500 flex items-center gap-1">
                            <span>{currencyFlags[toCurrency]?.flag}</span>
                            <span>{toCurrency}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={toAmount}
                        onChange={handleToAmountChange}
                        className="h-12 text-lg font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Refresh Button */}
                <Button
                  onClick={refreshRate}
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white h-10"
                >
                  {loading ? 'Updating...' : 'Refresh Rate'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Exchange Rate Details */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-neutral-200 dark:border-neutral-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Exchange Rate</p>
                    
                    {/* Main Rate Display */}
                    <div className="space-y-4">
                      {/* Format 1: Simple */}
                      <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                        <div className="text-3xl">{currencyFlags[fromCurrency]?.flag}</div>
                        <div className="flex-1">
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">1 {fromCurrency}</p>
                          <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{exchangeRate.toFixed(4)}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl">{currencyFlags[toCurrency]?.flag}</div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{toCurrency}</p>
                        </div>
                      </div>

                      {/* Inverse Rate */}
                      <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                        <div className="text-3xl">{currencyFlags[toCurrency]?.flag}</div>
                        <div className="flex-1">
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">1 {toCurrency}</p>
                          <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{(1 / exchangeRate).toFixed(4)}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl">{currencyFlags[fromCurrency]?.flag}</div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{fromCurrency}</p>
                        </div>
                      </div>

                      {/* Rate Change Info */}
                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-600 dark:text-neutral-400">Last Updated</span>
                          <span className="text-neutral-500 dark:text-neutral-500">
                            {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-emerald-500 mb-2" />
                    <div className="text-center">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Live Rate</p>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-1">Active</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sidebar Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          <StockMarketInsights />
        </motion.div>
      </div>

      {/* Quick Convert Cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle>Quick Reference</CardTitle>
            <CardDescription>Common currency conversions (1 unit)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { from: 'USD', to: 'EUR' },
                { from: 'USD', to: 'GBP' },
                { from: 'EUR', to: 'GBP' },
                { from: 'USD', to: 'JPY' },
                { from: 'USD', to: 'CAD' },
                { from: 'USD', to: 'AUD' },
                { from: 'EUR', to: 'CHF' },
                { from: 'GBP', to: 'USD' },
              ].map((pair) => {
                const rate = exchangeRate;
                return (
                  <div
                    key={`${pair.from}-${pair.to}`}
                    className="p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-100 dark:border-neutral-800"
                  >
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-1.5">
                      {currencyFlags[pair.from]?.flag && <span>{currencyFlags[pair.from].flag}</span>}
                      <span>{pair.from}</span>
                      <span>→</span>
                      {currencyFlags[pair.to]?.flag && <span>{currencyFlags[pair.to].flag}</span>}
                      <span>{pair.to}</span>
                    </p>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {pair.from === fromCurrency && pair.to === toCurrency
                        ? rate.toFixed(4)
                        : '~' + (pair.from === 'USD' ? '0.92' : '1.09')}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
