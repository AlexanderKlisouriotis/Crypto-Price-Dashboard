// server/src/scraper.ts
import { chromium, Browser, BrowserContext, Page } from 'playwright';

export interface PriceData {
  ticker: string;
  price: number;
  timestamp: Date;
}

export class TradingViewScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Map<string, Page> = new Map(); // Track pages by ticker
  public isInitialized = false;
  private activeSubscriptions: Map<string, (data: PriceData) => void> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 Scraper already initialized');
      return;
    }

    console.log('🔄 Initializing Playwright browser...');
    try {
      this.browser = await chromium.launch({ 
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--start-maximized',
          '--disable-dev-shm-usage'
        ]
      });

      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        viewport: null
      });
      
      this.isInitialized = true;
      console.log('✅ Playwright browser initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Playwright browser:', error);
      throw error;
    }
  }

  // Create a dedicated page for a ticker and set up monitoring
  async setupTickerPage(ticker: string): Promise<void> {
    if (!this.isInitialized || !this.context) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    if (this.pages.has(ticker)) {
      console.log(`Page for ${ticker} already exists`);
      return;
    }

    const url = `https://www.tradingview.com/symbols/${ticker}/?exchange=BINANCE`;
    console.log(`Creating page for ${ticker}: ${url}`);

    try {
      const page = await this.context.newPage();
      

      
      // Set up DOM mutation observer before navigating
      await page.exposeFunction('onPriceUpdate', (price: number) => {
        const callback = this.activeSubscriptions.get(ticker);
        if (callback) {
          callback({
            ticker,
            price,
            timestamp: new Date()
          });
        }
      });

      // Add a script to monitor price changes
      await page.addInitScript(() => {
        // Track the last price to avoid duplicate updates
        let lastPrice: number | null = null;
        
        // Function to monitor price changes
        const observePriceChanges = () => {
          // Try multiple selectors for the price element
          const selectors = [
            '.lastContainer-zoF9r75I'
          ];
          
          let priceElement = null;
          for (const selector of selectors) {
            priceElement = document.querySelector(selector);
            if (priceElement) break;
          } 
          if (priceElement) {
            // Create a MutationObserver to watch for price changes
            const observer = new MutationObserver((mutations) => {
              for (const mutation of mutations) {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                  const currentText = priceElement.textContent;
                  if (currentText) {
                    const cleanedPrice = currentText.replace(/[^\d.,]/g, '').replace(',', '');
                    const price = parseFloat(cleanedPrice);
                    
                    if (!isNaN(price) && price !== lastPrice) {
                      lastPrice = price;
                      // @ts-ignore - this function is exposed by Playwright
                      window.onPriceUpdate(price);
                    }
                  }
                }
              }
            });
            
            // Start observing the price element
            observer.observe(priceElement, {
              characterData: true,
              childList: true,
              subtree: true
            });
            
            console.log('✅ Price observation started');
            return true;
          }
          return false;
        };
        
        // Try to set up observation immediately
        if (!observePriceChanges()) {
          // If elements aren't ready yet, wait and try again
          const checkInterval = setInterval(() => {
            if (observePriceChanges()) {
              clearInterval(checkInterval);
            }
          }, 500);
        }
      });

      // Navigate to the page
      await page.goto(url, { waitUntil: 'networkidle', timeout: 5000 });

      const test = await page.url();


      // Store the page reference
      this.pages.set(ticker, page);
          
      console.log(`✅ Page for ${ticker} setup complete`);
      
    } catch (error) {
      console.error(`Error setting up page for ${ticker}:`, error);
      throw error;
    }
  }

  // Subscribe to real-time updates for a ticker
  async subscribeToTicker(ticker: string): Promise<AsyncIterable<PriceData>> {
    const normalizedTicker = ticker.toUpperCase();
    
    try {
      await this.setupTickerPage(normalizedTicker);
      return this.createPriceStream(normalizedTicker);
    } catch (error) {
      console.error(`❌ Error subscribing to ${normalizedTicker}:`, error);
      throw error;
    }
  }

  private createPriceStream(ticker: string): AsyncIterable<PriceData> {
    return {
      [Symbol.asyncIterator]: () => {
        return {
          next: () => {
            return new Promise<IteratorResult<PriceData>>((resolve) => {
              this.activeSubscriptions.set(ticker, (priceData: PriceData) => {
                resolve({ value: priceData, done: false });
              });
            });
          },
          return: () => {
            this.activeSubscriptions.delete(ticker);
            return Promise.resolve({ value: undefined, done: true });
          }
        };
      }
    };
  }

  // Get a single price reading (for one-time requests)
  async getPrice(ticker: string): Promise<PriceData> {
    const normalizedTicker = ticker.toUpperCase();
    
    if (!this.pages.has(normalizedTicker)) {
      await this.setupTickerPage(normalizedTicker);
    }
    
    const page = this.pages.get(normalizedTicker);
    if (!page) {
      throw new Error(`Page for ${normalizedTicker} not found`);
    }



    try {

       const notFound = await page.evaluate(() => {
      // Check for TradingView's 404 indicators
      return document.querySelector('.tv-http-error-page') !== null;
      });

      if(notFound)
      {
        throw new Error(`Ticker ${ticker} not found (404)`);
      }
      // Evaluate in the page context to get the current price
      const priceText = await page.evaluate(() => {
        const selectors = [
          '.lastContainer-zoF9r75I'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            return element.textContent;
          }
        }
        if(document.querySelector('.tv-http-error-page__title')?.textContent == "This isn't the page you're looking for")
          {
            this.closeTickerPage(ticker);
            console.log("test");
          }

        return null;
      });

      
      
      if (!priceText) {
        throw new Error(`Could not find price for ${ticker}`);
      }

      const cleanedPrice = priceText.replace(/[^\d.,]/g, '').replace(',', '');
      const price = parseFloat(cleanedPrice);
      
      if (isNaN(price)) {
        throw new Error(`Invalid price format for ${ticker}: ${priceText}`);
      }

      return {
        ticker: normalizedTicker,
        price,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error getting price for ${ticker}:`, error);
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('not found'))) {
      await this.closeTickerPage(normalizedTicker);
    }
      throw error;
    }
  }
  async closeTickerPage(ticker: string): Promise<void> {
    const normalizedTicker = ticker.toUpperCase();
    
    if (this.pages.has(normalizedTicker)) {
      const page = this.pages.get(normalizedTicker);
      if (page) {
        try {
          await page.close();
          this.pages.delete(normalizedTicker);
          console.log(`✅ Closed Playwright tab for ${normalizedTicker}`);
        } catch (error) {
          console.error(`❌ Error closing tab for ${normalizedTicker}:`, error);
          throw error;
        }
      }
    }
  }
  async close(): Promise<void> {
    // Close all pages
    for (const [ticker, page] of this.pages) {
      await page.close();
    }
    this.pages.clear();
    
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    
    this.isInitialized = false;
    console.log('Playwright browser closed');
  }
}

// Singleton instance and cleanup functions remain the same
let scraperInstance: TradingViewScraper | null = null;

export function getScraper(): TradingViewScraper {
  if (!scraperInstance) {
    scraperInstance = new TradingViewScraper();
  }
  return scraperInstance;
}

export async function cleanupScraper(): Promise<void> {
  if (scraperInstance) {
    await scraperInstance.close();
    scraperInstance = null;
  }
}

process.on('SIGINT', async () => {
  await cleanupScraper();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanupScraper();
  process.exit(0);
});

process.on('exit', async () => {
  await cleanupScraper();
});