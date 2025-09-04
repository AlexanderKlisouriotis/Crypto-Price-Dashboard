import { useState, useEffect, useCallback } from 'react';
import { priceClient, mockPriceClient } from '@/lib/price-client';
import TickerForm from './TickerForm';
import TickerList from './TickerList';
import ConnectionStatus from './ConnectionStatus';

interface Subscription {
  symbol: string;
  stream: AsyncIterable<any>;
  controller: AbortController;
}

const client = typeof window === 'undefined' ? mockPriceClient : priceClient;

export default function PriceTicker() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Map<string, Subscription>>(new Map());

  const subscribeToTicker = useCallback(async (symbol: string) => {
    if (subscriptions.has(symbol)) return;

    try {
      setIsLoading(true);
      const controller = new AbortController();
      
      // Create the request object
      const request = { ticker: symbol };
      
      const stream = client.subscribe(request, { signal: controller.signal });
      
      const subscription: Subscription = {
        symbol,
        stream,
        controller
      };

      setSubscriptions(prev => new Map(prev).set(symbol, subscription));

      // Process the stream
      (async () => {
        try {
          for await (const update of stream) {
            if (update && update.ticker && update.price !== undefined) {
              console.log(`Received price update for ${update.ticker}: ${update.price}`);
              setPrices(prev => ({
                ...prev,
                [update.ticker]: update.price.toString()
              }));
              
              // Add to tickers list if not already there
              setTickers(prev => {
                if (!prev.includes(update.ticker)) {
                  return [...prev, update.ticker].sort();
                }
                return prev;
              });
            }
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error(`Stream error for ${symbol}:`, err);
            setError(`Connection lost for ${symbol}`);
            // Remove the subscription on error
            setSubscriptions(prev => {
              const newSubs = new Map(prev);
              newSubs.delete(symbol);
              return newSubs;
            });
          }
        }
      })();

    } catch (err: any) {
      console.error(`Failed to subscribe to ${symbol}:`, err);
      setError(`Failed to subscribe to ${symbol}: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscriptions]);

  const unsubscribeFromTicker = useCallback(async (symbol: string) => {
    try {
      const subscription = subscriptions.get(symbol);
      if (subscription) {
        subscription.controller.abort();
        setSubscriptions(prev => {
          const newSubs = new Map(prev);
          newSubs.delete(symbol);
          return newSubs;
        });
      }

      setTickers(prev => prev.filter(t => t !== symbol).sort());
      setPrices(prev => {
        const newPrices = { ...prev };
        delete newPrices[symbol];
        return newPrices;
      });
      
      console.log(`Unsubscribed from ${symbol}`);
    } catch (err: any) {
      console.error(`Failed to unsubscribe from ${symbol}:`, err);
      setError(`Failed to unsubscribe from ${symbol}: ${err.message}`);
    }
  }, [subscriptions]);

  const addTicker = useCallback(async (symbol: string) => {
    if (tickers.includes(symbol)) {
      setError(`${symbol} is already being tracked`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await subscribeToTicker(symbol);
      
      // Update UI - the stream handler will add it to tickers
      console.log(`Successfully added ticker: ${symbol}`);
      
    } catch (err: any) {
      console.error(`Failed to add ticker ${symbol}:`, err);
      setError(`Failed to add ${symbol}: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [tickers, subscribeToTicker]);

  const removeTicker = useCallback(async (symbol: string) => {
    await unsubscribeFromTicker(symbol);
  }, [unsubscribeFromTicker]);

  // Test connection on mount
useEffect(() => {
  const testConnection = async () => {
    try {
      // Use fetch with mode: 'cors' and proper error handling
      const response = await fetch('http://localhost:8080/health', {
        method: 'GET',
        mode: 'cors', // Explicitly request CORS
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
  const interval = setInterval(testConnection, 3000); // Check every 3 seconds

  return () => clearInterval(interval);
}, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptions.forEach(sub => sub.controller.abort());
    };
  }, [subscriptions]);

  return (
    <div className="container">
      <h1>Crypto Price Streamer</h1>
      
      <ConnectionStatus isConnected={isConnected} error={error} />
      
      <TickerForm onAdd={addTicker} isLoading={isLoading} />
      <TickerList 
        tickers={tickers} 
        prices={prices} 
        onRemove={removeTicker}
        isLoading={isLoading}
      />
    </div>
  );
}