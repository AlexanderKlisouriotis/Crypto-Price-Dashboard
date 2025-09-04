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
  private readonly UPDATE_INTERVAL = 2000; // Update every 2 seconds

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
  async subscribe(
    ticker: string,
    subscriber: PriceSubscriber
  ): Promise<void> {
    const normalizedTicker = ticker.toUpperCase();
    
    console.log(`Subscribing to ${normalizedTicker} for subscriber`);

    if (!this.isScraperInitialized) {
      await this.initialize();
    }

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
      subscriber.sendUpdate({
        ticker: normalizedTicker,
        price: activeTicker.lastPrice,
        timestamp: new Date()
      });
    }
  }

  /**
   * Unsubscribe from price updates for a specific ticker
   */
  unsubscribe(ticker: string, subscriber: PriceSubscriber): void {
    const normalizedTicker = ticker.toUpperCase();
    const activeTicker = this.activeTickers.get(normalizedTicker);

    if (activeTicker) {
      activeTicker.subscribers.delete(subscriber);
      console.log(`Removed subscriber for ${normalizedTicker}. Remaining subscribers: ${activeTicker.subscribers.size}`);

      // If no more subscribers, stop polling and clean up
      if (activeTicker.subscribers.size === 0) {
        this.stopPolling(normalizedTicker);
        this.activeTickers.delete(normalizedTicker);
        console.log(`Stopped polling for ${normalizedTicker} - no more subscribers`);
      }
    }
  }
  /**
   * Start polling for a specific ticker
   */
  private async startPolling(ticker: string): Promise<void> {
    const activeTicker = this.activeTickers.get(ticker);
    if (!activeTicker || activeTicker.intervalId) {
      return; // Already polling or invalid ticker
    }

    console.log(`Starting polling for ${ticker}`);

    const poll = async () => {
      try {
        const priceData = await this.scraper.getPrice(ticker);
        activeTicker.lastPrice = priceData.price;
        
        // Broadcast to all subscribers
        this.broadcastUpdate(priceData);
      } catch (error) {
        console.error(`Error polling ${ticker}:`, error);
        // Continue polling even if there's an error
      }
    };

    // Initial poll
    await poll();

    // Set up interval for subsequent polls
    activeTicker.intervalId = setInterval(poll, this.UPDATE_INTERVAL);
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

  /**
   * Broadcast price update to all subscribers of a ticker
   */
  private broadcastUpdate(priceData: PriceData): void {
    const activeTicker = this.activeTickers.get(priceData.ticker);
    if (activeTicker) {
      console.log(`Broadcasting update for ${priceData.ticker}: $${priceData.price} to ${activeTicker.subscribers.size} subscribers`);
      
      activeTicker.subscribers.forEach(subscriber => {
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