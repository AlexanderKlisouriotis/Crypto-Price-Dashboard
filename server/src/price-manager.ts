import { PriceData } from './scraper';
import { getScraper } from './scraper';

// Interface for a price update subscriber
interface PriceSubscriber {
  sendUpdate: (data: PriceData) => void;
  ticker: string;
}

// Interface for active ticker information
interface ActiveTicker {
  subscribers: Set<PriceSubscriber>;
  intervalId: NodeJS.Timeout | null;
  lastPrice: number | null;
}

export class PriceManager {
  private activeTickers: Map<string, ActiveTicker> = new Map();
  private scraper = getScraper();
  private isScraperInitialized = false;
  private readonly UPDATE_INTERVAL = 100; // Update every 2 seconds

  /**
   * Initialize the price manager and the underlying scraper
   */
  async initialize(): Promise<void> {
  if (this.isScraperInitialized) return;

  console.log('Initializing PriceManager and Playwright scraper...');
  await this.scraper.initialize(); // This should launch the Playwright browser
  this.isScraperInitialized = true;
  console.log('PriceManager initialized with scraper');
}

  /**
   * Subscribe to price updates for a specific ticker
   */
  async subscribe(ticker: string, subscriber: PriceSubscriber): Promise<void> {
    const normalizedTicker = ticker.toUpperCase();
    
    console.log(`Subscribing to ${normalizedTicker} for subscriber`);

    if (!this.isScraperInitialized) {
      await this.initialize();
    }
    try{
    let activeTicker = this.activeTickers.get(normalizedTicker);

    if (!activeTicker) {
      // First subscriber for this ticker - create new entry
      activeTicker = {
        subscribers: new Set(),
        intervalId: null,
        lastPrice: null
      };
      this.activeTickers.set(normalizedTicker, activeTicker);
      
      // Start polling for this ticker
      await this.startPolling(normalizedTicker);
    }

    // Add subscriber to the set
    activeTicker.subscribers.add(subscriber);
    console.log(`Added subscriber for ${normalizedTicker}. Total subscribers: ${activeTicker.subscribers.size}`);

    // Send immediate update if we have a recent price
    if (activeTicker.lastPrice !== null) {
      try {
        subscriber.sendUpdate({
          ticker: normalizedTicker,
          price: activeTicker.lastPrice,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Error sending initial update to subscriber for ${normalizedTicker}:`, error);
        // Remove faulty subscriber immediately
        this.unsubscribe(normalizedTicker, subscriber);
      }
    }
    }catch (error)
    {
       console.error(`❌ Failed to subscribe to ${normalizedTicker}:`, error);
    // Re-throw the error so the client knows the subscription failed
    throw error;
    }
  }

  unsubscribe(ticker: string, subscriber: PriceSubscriber): void {
    const normalizedTicker = ticker.toUpperCase();
    const activeTicker = this.activeTickers.get(normalizedTicker);

    if (activeTicker) {
      // Check if this subscriber exists before trying to delete
      if (activeTicker.subscribers.has(subscriber)) {
        activeTicker.subscribers.delete(subscriber);
        console.log(`Removed subscriber for ${normalizedTicker}. Remaining subscribers: ${activeTicker.subscribers.size}`);

        // If no more subscribers, stop polling and clean up
        if (activeTicker.subscribers.size === 0) {
          this.stopPolling(normalizedTicker);
          this.activeTickers.delete(normalizedTicker);
          console.log(`Stopped polling for ${normalizedTicker} - no more subscribers`);
        }
      } else {
        console.log(`Subscriber not found for ${normalizedTicker} during unsubscribe`);
      }
    }
  }

  async removeTicker(ticker: string): Promise<void> {
    const normalizedTicker = ticker.toUpperCase();
    const activeTicker = this.activeTickers.get(normalizedTicker);

    if (activeTicker) {
      console.log(`🧹 Removing ticker ${normalizedTicker} and cleaning up resources`);
      
      // 1. Stop polling first
      this.stopPolling(normalizedTicker);
      
      // 2. Clear all subscribers
      activeTicker.subscribers.clear();
      
      // 3. Remove from active tickers
      this.activeTickers.delete(normalizedTicker);
      
      // 4. Close the Playwright page for this ticker
      try {
        await this.scraper.closeTickerPage(normalizedTicker);
        console.log(`✅ Closed Playwright tab for ${normalizedTicker}`);
      } catch (error) {
        console.error(`❌ Error closing Playwright tab for ${normalizedTicker}:`, error);
      }
      
      console.log(`✅ Fully removed ticker ${normalizedTicker}`);
    }
  }
  
  public async ensureInitialized(): Promise<void> {
  if (!this.isScraperInitialized) {
    await this.initialize();
  }
}
  /**
   * Start polling for a specific ticker
   */
  private async startPolling(ticker: string): Promise<void> {
  const activeTicker = this.activeTickers.get(ticker);
  if (!activeTicker || activeTicker.intervalId) {
    return;
  }

  console.log(`Starting polling for ${ticker}`);

  // ADD THIS FLAG TO TRACK IF WE SHOULD STOP
  let shouldStopPolling = false;

  const poll = async () => {
    // CHECK IF WE SHOULD STOP BEFORE POLLING
    if (shouldStopPolling) {
      this.stopPolling(ticker);
      return;
    }

    try {
      const priceData = await this.scraper.getPrice(ticker);
      activeTicker.lastPrice = priceData.price;
      this.broadcastUpdate(priceData);
    } catch (error) {
      console.error(`Error polling ${ticker}:`, error);
      
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('not found'))) {
        console.error(`❌ Ticker ${ticker} not found, stopping polling`);
        
        // SET THE FLAG TO STOP FUTURE POLLING
        shouldStopPolling = true;
        
        // 1. Stop the polling interval
        this.stopPolling(ticker);
        
        // 2. Remove from active tickers to prevent future polling
        this.activeTickers.delete(ticker);
        
        // 3. Close the Playwright tab for this ticker
        await this.scraper.closeTickerPage(ticker);
        
        // 4. Notify subscribers using the new method
        this.notifySubscribersOfError(ticker, `Ticker ${ticker} not found`);
        throw new Error(`Ticker ${ticker} not found on TradingView`)
      }
    }
  };

  try {
    await poll();
    
    // ONLY set up interval if initial poll succeeded and ticker still exists
    if (this.activeTickers.has(ticker) && !shouldStopPolling) {
      activeTicker.intervalId = setInterval(poll, this.UPDATE_INTERVAL);
    }
  } catch (error) {
    console.error(`Failed initial poll for ${ticker}:`, error);
  }
}

  /**
   * Stop polling for a specific ticker
   */
  private stopPolling(ticker: string): void {
    const activeTicker = this.activeTickers.get(ticker);
    if (activeTicker && activeTicker.intervalId) {
      clearInterval(activeTicker.intervalId);
      activeTicker.intervalId = null;
      console.log(`Stopped polling for ${ticker}`);
    }
  }


  private notifySubscribersOfError(ticker: string, errorMessage: string): void {
  const activeTicker = this.activeTickers.get(ticker);
  if (activeTicker) {
    const subscribers = Array.from(activeTicker.subscribers);
    
    subscribers.forEach(subscriber => {
      try {
        // Send a special error notification (price = -404 indicates error)
        subscriber.sendUpdate({
          ticker,
          price: -404, // Use -404 price to indicate error
          timestamp: new Date()
        });
        // You could also add console.error here to log the actual error
        console.error(`Error for ${ticker}: ${errorMessage}`);
      } catch (subError) {
        console.error(`Error notifying subscriber:`, subError);
      }
    });
     activeTicker.subscribers.clear();
  }
}

  /**
   * Broadcast price update to all subscribers of a ticker
   */
  private broadcastUpdate(priceData: PriceData): void {
    const activeTicker = this.activeTickers.get(priceData.ticker);
    if (activeTicker) {
      // Create a copy of subscribers to avoid modification during iteration
      const subscribers = Array.from(activeTicker.subscribers);
      
      console.log(`Broadcasting update for ${priceData.ticker}: $${priceData.price} to ${subscribers.length} subscribers`);
      
      subscribers.forEach(subscriber => {
        try {
          subscriber.sendUpdate(priceData);
        } catch (error) {
          console.error(`Error sending update to subscriber for ${priceData.ticker}:`, error);
          // Remove faulty subscriber
          this.unsubscribe(priceData.ticker, subscriber);
        }
      });
    }
  }

  /**
   * Get all currently active tickers
   */
  getActiveTickers(): string[] {
    return Array.from(this.activeTickers.keys()).sort(); // Sorted alphabetically as required
  }

  /**
   * Get subscriber count for a ticker
   */
  getSubscriberCount(ticker: string): number {
    const normalizedTicker = ticker.toUpperCase();
    const activeTicker = this.activeTickers.get(normalizedTicker);
    return activeTicker ? activeTicker.subscribers.size : 0;
  }

  /**
   * Clean up all resources
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down PriceManager...');
    
    // Stop all polling intervals
    this.activeTickers.forEach((_, ticker) => {
      this.stopPolling(ticker);
    });
    
    this.activeTickers.clear();
    
    // Close the scraper
    await this.scraper.close();
    this.isScraperInitialized = false;
    
    console.log('PriceManager shutdown complete');
  }
}

// Singleton instance
let priceManagerInstance: PriceManager | null = null;

/**
 * Get or create the shared PriceManager instance
 */
export function getPriceManager(): PriceManager {
  if (!priceManagerInstance) {
    priceManagerInstance = new PriceManager();
  }
  return priceManagerInstance;
}

/**
 * Cleanup function to shutdown the PriceManager when the process exits
 */
export async function cleanupPriceManager(): Promise<void> {
  if (priceManagerInstance) {
    await priceManagerInstance.shutdown();
    priceManagerInstance = null;
  }
}

// Handle process exit
process.on('SIGINT', cleanupPriceManager);
process.on('SIGTERM', cleanupPriceManager);
process.on('exit', cleanupPriceManager);