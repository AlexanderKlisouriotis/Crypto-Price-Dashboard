import { chromium } from 'playwright';
export class TradingViewScraper {
    browser = null;
    context = null;
    pages = new Map();
    isInitialized = false;
    activeSubscriptions = new Map();
    async initialize() {
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
        }
        catch (error) {
            console.error('❌ Failed to initialize Playwright browser:', error);
            throw error;
        }
    }
    async setupTickerPage(ticker) {
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
            await page.exposeFunction('onPriceUpdate', (price) => {
                const callback = this.activeSubscriptions.get(ticker);
                if (callback) {
                    callback({
                        ticker,
                        price,
                        timestamp: new Date()
                    });
                }
            });
            await page.addInitScript(() => {
                let lastPrice = null;
                const observePriceChanges = () => {
                    const selectors = [
                        '.lastContainer-zoF9r75I'
                    ];
                    let priceElement = null;
                    for (const selector of selectors) {
                        priceElement = document.querySelector(selector);
                        if (priceElement)
                            break;
                    }
                    if (priceElement) {
                        const observer = new MutationObserver((mutations) => {
                            for (const mutation of mutations) {
                                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                                    const currentText = priceElement.textContent;
                                    if (currentText) {
                                        const cleanedPrice = currentText.replace(/[^\d.,]/g, '').replace(',', '');
                                        const price = parseFloat(cleanedPrice);
                                        if (!isNaN(price) && price !== lastPrice) {
                                            lastPrice = price;
                                            window.onPriceUpdate(price);
                                        }
                                    }
                                }
                            }
                        });
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
                if (!observePriceChanges()) {
                    const checkInterval = setInterval(() => {
                        if (observePriceChanges()) {
                            clearInterval(checkInterval);
                        }
                    }, 500);
                }
            });
            await page.goto(url, { waitUntil: 'networkidle', timeout: 5000 });
            const test = await page.url();
            this.pages.set(ticker, page);
            console.log(`✅ Page for ${ticker} setup complete`);
        }
        catch (error) {
            console.error(`Error setting up page for ${ticker}:`, error);
            throw error;
        }
    }
    async subscribeToTicker(ticker) {
        const normalizedTicker = ticker.toUpperCase();
        try {
            await this.setupTickerPage(normalizedTicker);
            return this.createPriceStream(normalizedTicker);
        }
        catch (error) {
            console.error(`❌ Error subscribing to ${normalizedTicker}:`, error);
            throw error;
        }
    }
    createPriceStream(ticker) {
        return {
            [Symbol.asyncIterator]: () => {
                return {
                    next: () => {
                        return new Promise((resolve) => {
                            this.activeSubscriptions.set(ticker, (priceData) => {
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
    async getPrice(ticker) {
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
                return document.querySelector('.tv-http-error-page') !== null;
            });
            if (notFound) {
                throw new Error(`Ticker ${ticker} not found (404)`);
            }
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
                if (document.querySelector('.tv-http-error-page__title')?.textContent == "This isn't the page you're looking for") {
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
        }
        catch (error) {
            console.error(`Error getting price for ${ticker}:`, error);
            if (error instanceof Error && (error.message.includes('404') || error.message.includes('not found'))) {
                await this.closeTickerPage(normalizedTicker);
            }
            throw error;
        }
    }
    async closeTickerPage(ticker) {
        const normalizedTicker = ticker.toUpperCase();
        if (this.pages.has(normalizedTicker)) {
            const page = this.pages.get(normalizedTicker);
            if (page) {
                try {
                    await page.close();
                    this.pages.delete(normalizedTicker);
                    console.log(`✅ Closed Playwright tab for ${normalizedTicker}`);
                }
                catch (error) {
                    console.error(`❌ Error closing tab for ${normalizedTicker}:`, error);
                    throw error;
                }
            }
        }
    }
    async close() {
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
let scraperInstance = null;
export function getScraper() {
    if (!scraperInstance) {
        scraperInstance = new TradingViewScraper();
    }
    return scraperInstance;
}
export async function cleanupScraper() {
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
//# sourceMappingURL=scraper.js.map