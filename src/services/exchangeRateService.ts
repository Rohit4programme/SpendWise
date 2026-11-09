// Exchange rate service using free tier APIs
// We'll use exchangerate-api.com free tier (1500 requests/month)

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

interface ExchangeRateCache {
  rates: Record<string, number>;
  timestamp: number;
  baseCurrency: string;
}

const cache: Record<string, ExchangeRateCache> = {};
let cachedCurrencies: string[] | null = null;

// Currency flags and country mapping
export const currencyFlags: Record<string, { flag: string; country: string }> = {
  'AED': { flag: 'د.إ', country: 'United Arab Emirates' },
  'AFN': { flag: '؋', country: 'Afghanistan' },
  'ALL': { flag: 'L', country: 'Albania' },
  'AMD': { flag: '֏', country: 'Armenia' },
  'ANG': { flag: 'ƒ', country: 'Curaçao' },
  'AOA': { flag: 'Kz', country: 'Angola' },
  'ARS': { flag: '$', country: 'Argentina' },
  'AUD': { flag: 'A$', country: 'Australia' },
  'AWG': { flag: 'ƒ', country: 'Aruba' },
  'AZN': { flag: '₼', country: 'Azerbaijan' },
  'BAM': { flag: 'KM', country: 'Bosnia' },
  'BBD': { flag: 'Bds$', country: 'Barbados' },
  'BDT': { flag: '৳', country: 'Bangladesh' },
  'BGN': { flag: 'лв', country: 'Bulgaria' },
  'BHD': { flag: '.د.ب', country: 'Bahrain' },
  'BIF': { flag: 'FBu', country: 'Burundi' },
  'BMD': { flag: 'Ber$', country: 'Bermuda' },
  'BND': { flag: 'B$', country: 'Brunei' },
  'BOB': { flag: 'Bs', country: 'Bolivia' },
  'BRL': { flag: 'R$', country: 'Brazil' },
  'BSD': { flag: 'B$', country: 'Bahamas' },
  'BTC': { flag: '₿', country: 'Bitcoin' },
  'ETH': { flag: 'Ξ', country: 'Ethereum' },
  'ADA': { flag: '₳', country: 'Cardano' },
  'DOGE': { flag: '🐕', country: 'Dogecoin' },
  'XRP': { flag: 'XRP', country: 'Ripple' },
  'BNB': { flag: 'BNB', country: 'Binance Coin' },
  'SOL': { flag: 'SOL', country: 'Solana' },
  'USDC': { flag: 'USDC', country: 'USD Coin' },
  'USDT': { flag: 'USDT', country: 'Tether' },
  'LTC': { flag: 'Ł', country: 'Litecoin' },
  'BTN': { flag: 'Nu', country: 'Bhutan' },
  'BWP': { flag: 'P', country: 'Botswana' },
  'BYN': { flag: 'Br', country: 'Belarus' },
  'BZD': { flag: 'BZ$', country: 'Belize' },
  'CAD': { flag: 'Can$', country: 'Canada' },
  'CDF': { flag: 'FC', country: 'Congo' },
  'CHF': { flag: 'Fr', country: 'Switzerland' },
  'CLF': { flag: 'Ch$', country: 'Chile' },
  'CLP': { flag: 'Ch$', country: 'Chile' },
  'CNY': { flag: '¥', country: 'China' },
  'COP': { flag: 'Col$', country: 'Colombia' },
  'CRC': { flag: '₡', country: 'Costa Rica' },
  'CUC': { flag: '$', country: 'Cuba' },
  'CUP': { flag: '₱', country: 'Cuba' },
  'CVE': { flag: 'Esc', country: 'Cape Verde' },
  'CZK': { flag: 'Kč', country: 'Czech Republic' },
  'DJF': { flag: 'Fdj', country: 'Djibouti' },
  'DKK': { flag: 'kr', country: 'Denmark' },
  'DOP': { flag: 'RD$', country: 'Dominican Republic' },
  'DZD': { flag: '.د.ج', country: 'Algeria' },
  'EGP': { flag: '£', country: 'Egypt' },
  'ERN': { flag: 'Nfk', country: 'Eritrea' },
  'ETB': { flag: 'Br', country: 'Ethiopia' },
  'EUR': { flag: '€', country: 'Eurozone' },
  'FJD': { flag: 'FJ$', country: 'Fiji' },
  'FKP': { flag: '£', country: 'Falkland Islands' },
  'GBP': { flag: '£', country: 'United Kingdom' },
  'GEL': { flag: '₾', country: 'Georgia' },
  'GHS': { flag: '₵', country: 'Ghana' },
  'GIP': { flag: '£', country: 'Gibraltar' },
  'GMD': { flag: 'D', country: 'Gambia' },
  'GNF': { flag: 'Fr', country: 'Guinea' },
  'GTQ': { flag: 'Q', country: 'Guatemala' },
  'GYD': { flag: 'G$', country: 'Guyana' },
  'HKD': { flag: 'HK$', country: 'Hong Kong' },
  'HNL': { flag: 'L', country: 'Honduras' },
  'HRK': { flag: 'kn', country: 'Croatia' },
  'HTG': { flag: 'G', country: 'Haiti' },
  'HUF': { flag: 'Ft', country: 'Hungary' },
  'IDR': { flag: 'Rp', country: 'Indonesia' },
  'ILS': { flag: '₪', country: 'Israel' },
  'IMP': { flag: '£', country: 'Isle of Man' },
  'INR': { flag: '₹', country: 'India' },
  'IQD': { flag: '.د.ع', country: 'Iraq' },
  'IRR': { flag: '﷼', country: 'Iran' },
  'ISK': { flag: 'kr', country: 'Iceland' },
  'JEP': { flag: '£', country: 'Jersey' },
  'JMD': { flag: 'J$', country: 'Jamaica' },
  'JOD': { flag: '.د.أ', country: 'Jordan' },
  'JPY': { flag: '¥', country: 'Japan' },
  'KES': { flag: 'KSh', country: 'Kenya' },
  'KGS': { flag: 'с', country: 'Kyrgyzstan' },
  'KHR': { flag: '៛', country: 'Cambodia' },
  'KMF': { flag: 'FC', country: 'Comoros' },
  'KPW': { flag: '₩', country: 'North Korea' },
  'KRW': { flag: '₩', country: 'South Korea' },
  'KWD': { flag: '.د.ك', country: 'Kuwait' },
  'KYD': { flag: 'CI$', country: 'Cayman Islands' },
  'KZT': { flag: '₸', country: 'Kazakhstan' },
  'LAK': { flag: '₭', country: 'Laos' },
  'LBP': { flag: '£', country: 'Lebanon' },
  'LKR': { flag: 'රු', country: 'Sri Lanka' },
  'LRD': { flag: 'L$', country: 'Liberia' },
  'LSL': { flag: 'L', country: 'Lesotho' },
  'LYD': { flag: '.د.ل', country: 'Libya' },
  'MAD': { flag: '.د.م', country: 'Morocco' },
  'MDL': { flag: 'L', country: 'Moldova' },
  'MGA': { flag: 'Ar', country: 'Madagascar' },
  'MKD': { flag: 'ден', country: 'Macedonia' },
  'MMK': { flag: 'K', country: 'Myanmar' },
  'MNT': { flag: '₮', country: 'Mongolia' },
  'MOP': { flag: 'P', country: 'Macau' },
  'MRU': { flag: 'UM', country: 'Mauritania' },
  'MUR': { flag: '₨', country: 'Mauritius' },
  'MVR': { flag: 'Rf', country: 'Maldives' },
  'MWK': { flag: 'MK', country: 'Malawi' },
  'MXN': { flag: 'Mex$', country: 'Mexico' },
  'MYR': { flag: 'RM', country: 'Malaysia' },
  'MZN': { flag: 'MT', country: 'Mozambique' },
  'NAD': { flag: 'N$', country: 'Namibia' },
  'NGN': { flag: '₦', country: 'Nigeria' },
  'NIO': { flag: 'C$', country: 'Nicaragua' },
  'NOK': { flag: 'kr', country: 'Norway' },
  'NPR': { flag: '₨', country: 'Nepal' },
  'NZD': { flag: 'NZ$', country: 'New Zealand' },
  'OMR': { flag: 'ر.ع.', country: 'Oman' },
  'PAB': { flag: 'B/.', country: 'Panama' },
  'PEN': { flag: 'S/', country: 'Peru' },
  'PGK': { flag: 'K', country: 'Papua New Guinea' },
  'PHP': { flag: '₱', country: 'Philippines' },
  'PKR': { flag: '₨', country: 'Pakistan' },
  'PLN': { flag: 'zł', country: 'Poland' },
  'PYG': { flag: '₲', country: 'Paraguay' },
  'QAR': { flag: '.ر.ق', country: 'Qatar' },
  'RON': { flag: 'lei', country: 'Romania' },
  'RSD': { flag: 'дин', country: 'Serbia' },
  'RUB': { flag: '₽', country: 'Russia' },
  'RWF': { flag: 'FRw', country: 'Rwanda' },
  'SAR': { flag: 'ر.س', country: 'Saudi Arabia' },
  'SBD': { flag: 'SI$', country: 'Solomon Islands' },
  'SCR': { flag: '₨', country: 'Seychelles' },
  'SDG': { flag: '.ج.س', country: 'Sudan' },
  'SEK': { flag: 'kr', country: 'Sweden' },
  'SGD': { flag: 'S$', country: 'Singapore' },
  'SHP': { flag: '£', country: 'Saint Helena' },
  'SLL': { flag: 'Le', country: 'Sierra Leone' },
  'SOS': { flag: 'Sh', country: 'Somalia' },
  'SPL': { flag: 'SDR', country: 'Special Drawing Rights' },
  'SRD': { flag: 'SRD', country: 'Suriname' },
  'STN': { flag: 'Db', country: 'São Tomé' },
  'SYP': { flag: '£', country: 'Syria' },
  'SZL': { flag: 'E', country: 'Eswatini' },
  'THB': { flag: '฿', country: 'Thailand' },
  'TJS': { flag: 'ЅМ', country: 'Tajikistan' },
  'TMT': { flag: 'm', country: 'Turkmenistan' },
  'TND': { flag: '.د.ت', country: 'Tunisia' },
  'TOP': { flag: 'T$', country: 'Tonga' },
  'TRY': { flag: '₺', country: 'Turkey' },
  'TTD': { flag: 'TT$', country: 'Trinidad' },
  'TVD': { flag: 'TV$', country: 'Tuvalu' },
  'TWD': { flag: 'NT$', country: 'Taiwan' },
  'TZS': { flag: 'TSh', country: 'Tanzania' },
  'UAH': { flag: '₴', country: 'Ukraine' },
  'UGX': { flag: 'USh', country: 'Uganda' },
  'USD': { flag: '$', country: 'United States' },
  'UYU': { flag: 'Ur$', country: 'Uruguay' },
  'UZS': { flag: 'сўм', country: 'Uzbekistan' },
  'VES': { flag: 'Bs.S', country: 'Venezuela' },
  'VND': { flag: '₫', country: 'Vietnam' },
  'VUV': { flag: 'VT', country: 'Vanuatu' },
  'WST': { flag: 'WS$', country: 'Samoa' },
  'XAF': { flag: 'Fr', country: 'Central African' },
  'XAG': { flag: '🥈', country: 'Silver' },
  'XAU': { flag: '🥇', country: 'Gold' },
  'XBA': { flag: 'XBA', country: 'Bond Markets' },
  'XBB': { flag: 'XBB', country: 'Bond Markets' },
  'XBC': { flag: 'XBC', country: 'Bond Markets' },
  'XBD': { flag: 'XBD', country: 'Bond Markets' },
  'XCD': { flag: 'EC$', country: 'East Caribbean' },
  'XDR': { flag: 'SDR', country: 'Special Drawing Rights' },
  'XOF': { flag: 'Fr', country: 'West African' },
  'XPD': { flag: '⚪', country: 'Palladium' },
  'XPF': { flag: 'Fr', country: 'Pacific' },
  'XPT': { flag: '⚪', country: 'Platinum' },
  'XSU': { flag: 'XSU', country: 'Sucre' },
  'XTS': { flag: 'XTS', country: 'Testing' },
  'XUA': { flag: 'XUA', country: 'ADB Unit' },
  'XXX': { flag: '¤', country: 'Unknown' },
  'YER': { flag: '.ر.ي', country: 'Yemen' },
  'ZAR': { flag: 'R', country: 'South Africa' },
  'ZMW': { flag: 'ZK', country: 'Zambia' },
  'ZWL': { flag: 'Z$', country: 'Zimbabwe' },
};

export const exchangeRateService = {
  async getExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
    const now = Date.now();
    
    // Check if we have cached data
    if (cache[baseCurrency] && now - cache[baseCurrency].timestamp < CACHE_DURATION) {
      return cache[baseCurrency].rates;
    }

    try {
      const response = await fetch(`${EXCHANGE_RATE_API}/${baseCurrency.toUpperCase()}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      cache[baseCurrency] = {
        rates: data.rates,
        timestamp: now,
        baseCurrency
      };

      // Cache available currencies from the API response
      if (data.rates && !cachedCurrencies) {
        cachedCurrencies = Object.keys(data.rates).sort();
      }

      return data.rates;
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      
      // Return cached data if available, even if expired
      if (cache[baseCurrency]) {
        return cache[baseCurrency].rates;
      }
      
      // Fallback to dummy rates if no cache
      return getDummyRates();
    }
  },

  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await this.getExchangeRates(fromCurrency);
    const rate = rates[toCurrency.toUpperCase()];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }

    return amount * rate;
  },

  async getSupportedCurrencies(): Promise<string[]> {
    // Return cached currencies if available
    if (cachedCurrencies) {
      return cachedCurrencies;
    }

    // Try to fetch from API
    try {
      const response = await fetch(`${EXCHANGE_RATE_API}/USD`);
      if (response.ok) {
        const data = await response.json();
        if (data.rates) {
          cachedCurrencies = Object.keys(data.rates).sort();
          return cachedCurrencies;
        }
      }
    } catch (error) {
      console.error('Failed to fetch currencies from API:', error);
    }

    // Fallback to comprehensive list
    return getComprehensiveCurrencyList();
  }
};

function getDummyRates(): Record<string, number> {
  // Comprehensive fallback rates (approximate)
  return {
    'AED': 3.67, 'AFN': 70.5, 'ALL': 93.2, 'AMD': 387.5, 'ANG': 1.79,
    'AOA': 834.5, 'ARS': 850.0, 'AUD': 1.53, 'AWG': 1.79, 'AZN': 1.7,
    'BAM': 1.8, 'BBD': 2.0, 'BDT': 104.5, 'BGN': 1.8, 'BHD': 0.377,
    'BIF': 2870.0, 'BMD': 1.0, 'BND': 1.35, 'BOB': 6.9, 'BRL': 4.97,
    'BSD': 1.0, 'BTC': 0.000016, 'ETH': 0.00033, 'ADA': 2.0, 'DOGE': 4.0, 'XRP': 0.5, 'BNB': 0.00167, 'SOL': 0.0077, 'USDC': 1.0, 'USDT': 1.0, 'LTC': 0.00167, 'BTN': 83.5, 'BWP': 13.5, 'BYN': 3.27,
    'BZD': 2.0, 'CAD': 1.36, 'CDF': 2770.0, 'CHF': 0.88, 'CLF': 0.0298,
    'CLP': 950.0, 'CNY': 7.24, 'COP': 4200.0, 'CRC': 520.0, 'CUC': 1.0,
    'CUP': 24.0, 'CVE': 102.0, 'CZK': 24.5, 'DJF': 178.0, 'DKK': 6.85,
    'DOP': 58.5, 'DZD': 134.5, 'EGP': 30.9, 'ERN': 15.0, 'ETB': 56.5,
    'EUR': 0.92, 'FJD': 2.2, 'FKP': 0.79, 'GBP': 0.79, 'GEL': 2.65,
    'GHS': 12.5, 'GIP': 0.79, 'GMD': 67.5, 'GNF': 8600.0, 'GTQ': 7.75,
    'GYD': 209.0, 'HKD': 7.78, 'HNL': 24.5, 'HRK': 6.95, 'HTG': 131.0,
    'HUF': 358.0, 'IDR': 16200.0, 'ILS': 3.65, 'IMP': 0.79, 'INR': 83.12,
    'IQD': 1310.0, 'IRR': 42100.0, 'ISK': 137.0, 'JEP': 0.79, 'JMD': 154.0,
    'JOD': 0.71, 'JPY': 149.5, 'KES': 131.0, 'KGS': 84.5, 'KHR': 4100.0,
    'KMF': 455.0, 'KPW': 900.0, 'KRW': 1319.0, 'KWD': 0.307, 'KYD': 0.833,
    'KZT': 430.0, 'LAK': 20700.0, 'LBP': 88500.0, 'LKR': 330.0, 'LRD': 187.0,
    'LSL': 18.5, 'LYD': 4.8, 'MAD': 10.0, 'MDL': 17.5, 'MGA': 4400.0,
    'MKD': 57.0, 'MMK': 2100.0, 'MNT': 3400.0, 'MOP': 8.05, 'MRU': 39.0,
    'MUR': 44.0, 'MVR': 15.4, 'MWK': 1060.0, 'MXN': 17.05, 'MYR': 4.7,
    'MZN': 64.0, 'NAD': 18.5, 'NGN': 1235.0, 'NIO': 36.5, 'NOK': 10.6,
    'NPR': 132.0, 'NZD': 1.67, 'OMR': 0.385, 'PAB': 1.0, 'PEN': 3.75,
    'PGK': 3.55, 'PHP': 56.0, 'PKR': 278.0, 'PLN': 4.05, 'PYG': 7300.0,
    'QAR': 3.64, 'RON': 4.55, 'RSD': 108.0, 'RUB': 92.0, 'RWF': 1300.0,
    'SAR': 3.75, 'SBD': 8.4, 'SCR': 13.5, 'SDG': 601.0, 'SEK': 10.8,
    'SGD': 1.35, 'SHP': 0.79, 'SLL': 20900.0, 'SOS': 571.0, 'SPL': 0.001,
    'SRD': 33.5, 'STN': 22.5, 'SYP': 2512.0, 'SZL': 18.5, 'THB': 35.5,
    'TJS': 10.8, 'TMT': 3.5, 'TND': 3.1, 'TOP': 2.35, 'TRY': 32.5,
    'TTD': 6.75, 'TVD': 1.3, 'TWD': 31.5, 'TZS': 2540.0, 'UAH': 40.0,
    'UGX': 3750.0, 'USD': 1.0, 'UYU': 39.0, 'UZS': 12700.0, 'VES': 34.5,
    'VND': 24500.0, 'VUV': 119.0, 'WST': 2.75, 'XAF': 607.0, 'XAG': 0.035,
    'XAU': 0.00046, 'XBA': 0.0001, 'XBB': 0.0001, 'XBC': 0.0001, 'XBD': 0.0001,
    'XCD': 2.7, 'XDR': 0.75, 'XOF': 607.0, 'XPD': 0.0009, 'XPF': 110.0,
    'XPT': 0.001, 'XSU': 1.0, 'XTS': 1.0, 'XUA': 1.0, 'XXX': 1.0,
    'YER': 250.0, 'ZAR': 18.65, 'ZMW': 20.5, 'ZWL': 3200.0
  };
}

function getComprehensiveCurrencyList(): string[] {
  return Object.keys(getDummyRates()).sort();
}
