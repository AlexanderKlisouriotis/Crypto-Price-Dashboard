interface TickerListProps {
  tickers: string[];
  prices: Record<string, string>;
  onRemove: (symbol: string) => void;
  isLoading?: boolean;
}

export default function TickerList({ tickers, prices, onRemove, isLoading = false }: TickerListProps) {
  
  const handleRemove = async (symbol: string) => {
    if (isLoading) return;
    
    try {
      // Call the onRemove callback which should handle both UI update AND backend cleanup
      onRemove(symbol);
      
    } catch (error) {
      console.error(`Failed to remove ticker ${symbol}:`, error);
    }
  };

  if (tickers.length === 0) {
    return (
      <div className="ticker-list">
        <p>No tickers added yet. Add a ticker to see real-time prices.</p>
        <p className="hint">Try: BTCUSD, ETHUSD, or SOLUSD</p>
      </div>
    );
  }

  return (
    <div className="ticker-list">
      <h2>Tracked Tickers ({tickers.length})</h2>
      <ul>
        {tickers.map(symbol => (
          <li key={symbol} className="ticker-item">
            <span className="symbol">{symbol}</span>
            <span className="price">
              {prices[symbol] ? `$${parseFloat(prices[symbol]).toFixed(2)}` : 'Loading...'}
            </span>
            <button 
              onClick={() => handleRemove(symbol)}
              className="remove-btn"
              disabled={isLoading}
              aria-label={`Remove ${symbol}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}