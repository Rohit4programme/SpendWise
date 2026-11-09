import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { stockMarketService, StockSymbol } from '../../services/stockMarketService';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { motion } from 'motion/react';

export default function StockMarketInsights() {
  const [stocks, setStocks] = useState<StockSymbol[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockSymbol | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const data = await stockMarketService.getPopularStocks();
        setStocks(data);
        setSelectedStock(data[0]); // Default to first stock
      } catch (error) {
        console.error('Failed to fetch stocks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStocks, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStockSelect = (stock: StockSymbol) => {
    setSelectedStock(stock);
  };

  if (loading) {
    return (
      <Card className="border-neutral-200 dark:border-neutral-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Stock Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading market data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.2 }} 
      className="space-y-4"
    >
      {/* Stock Selection */}
      <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Real-Time Stock Insights
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            Live market data with candlestick analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stock Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {stocks.map((stock) => (
              <motion.button
                key={stock.symbol}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStockSelect(stock)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedStock?.symbol === stock.symbol
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                }`}
              >
                {stock.symbol}
              </motion.button>
            ))}
          </div>

          {/* Stock Details */}
          {selectedStock && (
            <div className="space-y-3 p-3 bg-white dark:bg-neutral-900/50 rounded-lg border border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    {selectedStock.symbol}
                  </p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    ${selectedStock.price.toFixed(2)}
                  </p>
                </div>
                <div className={`text-right p-2 rounded-lg ${
                  selectedStock.change >= 0
                    ? 'bg-emerald-100 dark:bg-emerald-900/20'
                    : 'bg-red-100 dark:bg-red-900/20'
                }`}>
                  <div className="flex items-center gap-1 justify-end">
                    {selectedStock.change >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span className={`font-semibold ${
                      selectedStock.change >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)}
                    </span>
                  </div>
                  <p className={`text-xs font-medium ${
                    selectedStock.change >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candlestick Chart */}
      {selectedStock && (
        <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">24-Hour Chart</CardTitle>
            <CardDescription className="text-xs">
              Candlestick view with hourly intervals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart
                data={selectedStock.candleData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 11 }}
                  interval={Math.floor(selectedStock.candleData.length / 6)}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  labelStyle={{ color: '#374151', fontSize: '12px' }}
                />
                {/* Candlestick bodies */}
                <Bar 
                  dataKey="open" 
                  fill="transparent"
                  shape={<CandleStick />}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// Custom candlestick component
function CandleStick(props: any) {
  const { x, y, width, payload } = props;

  if (!payload) return null;

  const { open, close, high, low } = payload;
  const candleWidth = width * 0.6;
  const wickWidth = candleWidth * 0.2;

  // Scale for Y-axis - this is a simplified version
  const minY = Math.min(open, close, high, low);
  const maxY = Math.max(open, close, high, low);
  const range = maxY - minY || 1;
  
  const scale = 200 / range; // Approximate scale to fit in chart
  const baseY = 200; // Approximate baseline

  const highY = baseY - (high - minY) * scale;
  const lowY = baseY - (low - minY) * scale;
  const openY = baseY - (open - minY) * scale;
  const closeY = baseY - (close - minY) * scale;

  const isGreen = close >= open;
  const color = isGreen ? '#10b981' : '#ef4444'; // Green for up, red for down

  const candleX = x + (width - candleWidth) / 2;
  const wickX = x + width / 2 - wickWidth / 2;

  return (
    <g>
      {/* High-Low wick */}
      <line
        x1={x + width / 2}
        y1={highY}
        x2={x + width / 2}
        y2={lowY}
        stroke={color}
        strokeWidth={1}
      />
      {/* Open-Close body */}
      <rect
        x={candleX}
        y={Math.min(openY, closeY)}
        width={candleWidth}
        height={Math.abs(closeY - openY) || 1}
        fill={color}
        opacity={0.8}
      />
    </g>
  );
}
