// Mock stock market data service with candlestick data
// In production, replace with real API calls (e.g., Alpha Vantage, IEX Cloud, etc.)

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockSymbol {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  candleData: CandleData[];
}

// Generate mock candlestick data for demonstration
const generateMockCandleData = (basePrice: number, symbol: string): CandleData[] => {
  const data: CandleData[] = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const timeStr = time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Generate realistic OHLC data
    const variance = basePrice * 0.02; // 2% variance
    const open = basePrice + (Math.random() - 0.5) * variance;
    const close = basePrice + (Math.random() - 0.5) * variance;
    const high = Math.max(open, close) + Math.random() * (variance * 0.5);
    const low = Math.min(open, close) - Math.random() * (variance * 0.5);
    
    data.push({
      time: timeStr,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 100000,
    });
  }
  
  return data;
};

export const stockMarketService = {
  // Get popular stock symbols with mock data
  getPopularStocks: async (): Promise<StockSymbol[]> => {
    const stocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 195.5 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', basePrice: 425.8 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 142.3 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', basePrice: 183.9 },
      { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 242.1 },
    ];

    return stocks.map(stock => {
      const candleData = generateMockCandleData(stock.basePrice, stock.symbol);
      const lastCandle = candleData[candleData.length - 1];
      const firstCandle = candleData[0];
      const change = lastCandle.close - firstCandle.open;
      const changePercent = (change / firstCandle.open) * 100;

      return {
        symbol: stock.symbol,
        name: stock.name,
        price: lastCandle.close,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        candleData,
      };
    });
  },

  // Get candlestick data for a specific stock
  getCandleData: async (symbol: string): Promise<CandleData[]> => {
    const stocks: Record<string, number> = {
      'AAPL': 195.5,
      'MSFT': 425.8,
      'GOOGL': 142.3,
      'AMZN': 183.9,
      'TSLA': 242.1,
    };

    const basePrice = stocks[symbol] || 100;
    return generateMockCandleData(basePrice, symbol);
  },

  // Get real-time price update (simulated)
  getRealtimePrice: async (symbol: string): Promise<number> => {
    const stocks: Record<string, number> = {
      'AAPL': 195.5,
      'MSFT': 425.8,
      'GOOGL': 142.3,
      'AMZN': 183.9,
      'TSLA': 242.1,
    };

    const basePrice = stocks[symbol] || 100;
    const variance = basePrice * 0.01;
    return parseFloat((basePrice + (Math.random() - 0.5) * variance).toFixed(2));
  },
};
