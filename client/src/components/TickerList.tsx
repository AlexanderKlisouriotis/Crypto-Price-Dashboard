import { X, TrendingUp, Activity } from 'lucide-react';

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
      onRemove(symbol);
    } catch (error) {
      console.error(`Failed to remove ticker ${symbol}:`, error);
    }
  };

  if (tickers.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '6rem 0',
        color: 'var(--secondary)',
        border: '1px dashed var(--card-border)',
        borderRadius: 'var(--radius)',
        background: 'rgba(22, 27, 34, 0.5)'
      }}>
        <div style={{ marginBottom: '1rem', opacity: 0.5 }}>
          <Activity size={48} />
        </div>
        <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>No active streams</p>
        <p style={{ fontSize: '0.9rem' }}>Add a ticker code to initialize a WebSocket stream.</p>
      </div>
    );
  }

  return (
    <div className="tickerGrid">
      {tickers.map(symbol => {
        const price = prices[symbol];

        return (
          <div
            key={symbol}
            className="animate-in"
            style={{
              background: 'var(--card-bg)',
              borderRadius: 'var(--radius)',
              padding: '1.5rem',
              position: 'relative',
              transition: 'var(--transition-smooth)',
              border: '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--card-border)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1f2937, #111827)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  color: '#fff',
                  border: '1px solid #374151'
                }}>
                  {symbol.substring(0, 2)}
                </div>
                <div>
                  <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--foreground)', display: 'block' }}>{symbol}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', textTransform: 'uppercase' }}>Crypto Asset</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(symbol);
                }}
                disabled={isLoading}
                aria-label={`Remove ${symbol}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--secondary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--danger)';
                  e.currentTarget.style.background = 'rgba(218, 54, 51, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--secondary)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>Last Price</span>
                <span style={{
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  color: 'var(--foreground)',
                  letterSpacing: '-0.5px',
                  fontFamily: 'monospace'
                }}>
                  {price ? `$${parseFloat(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '...'}
                </span>
              </div>

              {price && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.85rem',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  background: 'rgba(46, 160, 67, 0.15)',
                  color: 'var(--success)',
                  fontWeight: '500'
                }}>
                  <TrendingUp size={14} />
                  <span>Live</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

