import { useState, useEffect, useCallback, useRef } from 'react';
import { priceClient } from '@/lib/price-client';
import styles from '@/styles/Home.module.css';
import TickerForm from './TickerForm';
import TickerList from './TickerList';
import ConnectionStatus from './ConnectionStatus';
import { Code, ConnectError } from '@connectrpc/connect';
import { Grid, LayoutGrid } from 'lucide-react';

interface Subscription {
  symbol: string;
  controller: AbortController;
  isActive: boolean;
}

export default function PriceTicker() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use refs for subscriptions to avoid stale closures
  const subscriptionsRef = useRef<Map<string, Subscription>>(new Map());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up all subscriptions on unmount
      subscriptionsRef.current.forEach(sub => {
        sub.isActive = false;
        sub.controller.abort();
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  const subscribeToTicker = useCallback(async (symbol: string) => {
    if (subscriptionsRef.current.has(symbol)) return;

    try {
      setIsLoading(true);
      const controller = new AbortController();

      const subscription: Subscription = {
        symbol,
        controller,
        isActive: true
      };

      subscriptionsRef.current.set(symbol, subscription);

      const request = { ticker: symbol };
      const stream = priceClient.subscribe(request, { signal: controller.signal });

      // Process the stream in a separate async function
      (async () => {
        try {
          for await (const update of stream) {
            const currentSub = subscriptionsRef.current.get(symbol);
            if (!currentSub?.isActive || !isMountedRef.current) {
              break;
            }
            if (update.price === -404) {
              unsubscribeFromTicker(symbol);
            }
            if (update && update.ticker && update.price !== undefined) {
              setPrices(prev => ({
                ...prev,
                [update.ticker]: update.price.toString()
              }));

              setTickers(prev => {
                if (!prev.includes(update.ticker)) {
                  return [...prev, update.ticker].sort();
                }
                return prev;
              });
            }
          }
        } catch (err: any) {
          const currentSub = subscriptionsRef.current.get(symbol);
          if (currentSub?.isActive && isMountedRef.current && err.name !== 'AbortError') {
            console.error(`Stream error for ${symbol}:`, err);

            // HANDLE CONNECTERROR SPECIFICALLY
            if (err instanceof ConnectError) {
              if (err.code === Code.NotFound) {
                setError(`Ticker ${symbol} not found on TradingView`);
              } else {
                setError(`Error with ${symbol}: ${err.message}`);
              }
            } else {
              setError(`Connection lost for ${symbol}`);
            }
            unsubscribeFromTicker(symbol);
          }
        }
      })();

    } catch (err: any) {
      console.error(`Failed to subscribe to ${symbol}:`, err);

      // HANDLE CONNECTERROR IN INITIAL SUBSCRIPTION
      if (err instanceof ConnectError) {
        if (err.code === Code.NotFound) {
          setError(`Ticker ${symbol} not found on TradingView`);
        } else {
          setError(`Failed to subscribe to ${symbol}: ${err.message}`);
        }
      } else {
        setError(`Failed to subscribe to ${symbol}: ${err.message}`);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribeFromTicker = useCallback((symbol: string) => {
    const subscription = subscriptionsRef.current.get(symbol);
    if (subscription) {
      // Mark as inactive first, then abort
      subscription.isActive = false;
      subscription.controller.abort();
      subscriptionsRef.current.delete(symbol);
    }

    setTickers(prev => prev.filter(t => t !== symbol));
    setPrices(prev => {
      const newPrices = { ...prev };
      delete newPrices[symbol];
      return newPrices;
    });

    console.log(`Unsubscribed from ${symbol}`);
  }, []);

  const addTicker = useCallback(async (symbol: string) => {
    const normalizedSymbol = symbol.toUpperCase();

    if (tickers.includes(normalizedSymbol)) {
      setError(`${normalizedSymbol} is already being tracked`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let test = await subscribeToTicker(normalizedSymbol);

      console.log(`Successfully added ticker: ${normalizedSymbol}`);

    } catch (err: any) {
      console.error(`Failed to add ticker ${normalizedSymbol}:`, err);
      setError(`Failed to add ${normalizedSymbol}: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [tickers, subscribeToTicker]);

  const removeTicker = useCallback(async (symbol: string) => {
    try {

      unsubscribeFromTicker(symbol);

      const response = await priceClient.removeTicker({ ticker: symbol });

      if (response.success) {
        console.log(`✅ ${response.message}`);
      } else {
        console.error(`❌ ${response.message}`);
        setError(response.message);
      }

    } catch (error) {
      console.error(`Failed to remove ticker ${symbol} from Playwright:`, error);
      setError(`Failed to remove ${symbol} from Playwright: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [unsubscribeFromTicker]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('http://localhost:8080/health', {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Backend connection successful:', data);
          setIsConnected(true);
          setError(null);
        } else {
          console.log('❌ Backend health check failed:', response.status);
          setIsConnected(false);
          setError(`Backend responded with status: ${response.status}`);
        }
      } catch (err) {
        console.log('❌ Cannot connect to backend:', err);
        setIsConnected(false);
        setError('Cannot connect to backend server. Make sure it\'s running on http://localhost:8080');
      }
    };

    testConnection();
    const interval = setInterval(testConnection, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <Grid size={24} color="#58a6ff" />
          <span>CryptoPrice</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ConnectionStatus isConnected={isConnected} error={error} />
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #405de6, #fd1d1d)',
            border: '2px solid #0d1117'
          }}></div>
        </div>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Track Crypto Real-Time</h1>
          <p className={styles.heroSubtitle}>
            A professional dashboard for monitoring cryptocurrency prices with low latency.
          </p>
          <div className={styles.formSection}>
            <TickerForm onAdd={addTicker} isLoading={isLoading} />
          </div>
        </div>
      </div>

      <div>
        <h2 className={styles.sectionTitle}>
          <LayoutGrid size={20} />
          Active Feeds
        </h2>
        <TickerList
          tickers={tickers}
          prices={prices}
          onRemove={removeTicker}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

