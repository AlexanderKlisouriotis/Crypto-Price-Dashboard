import { getScraper } from './scraper';
export class PriceManager {
    activeTickers = new Map();
    scraper = getScraper();
    isScraperInitialized = false;
    UPDATE_INTERVAL = 100;
    async initialize() {
        if (this.isScraperInitialized)
            return;
        console.log('Initializing PriceManager and Playwright scraper...');
        await this.scraper.initialize();
        this.isScraperInitialized = true;
        console.log('PriceManager initialized with scraper');
    }
    async subscribe(ticker, subscriber) {
        const normalizedTicker = ticker.toUpperCase();
        console.log(`Subscribing to ${normalizedTicker} for subscriber`);
        if (!this.isScraperInitialized) {
            await this.initialize();
        }
        try {
            let activeTicker = this.activeTickers.get(normalizedTicker);
            if (!activeTicker) {
                activeTicker = {
                    subscribers: new Set(),
                    intervalId: null,
                    lastPrice: null
                };
                this.activeTickers.set(normalizedTicker, activeTicker);
                await this.startPolling(normalizedTicker);
            }
            activeTicker.subscribers.add(subscriber);
            console.log(`Added subscriber for ${normalizedTicker}. Total subscribers: ${activeTicker.subscribers.size}`);
            if (activeTicker.lastPrice !== null) {
                try {
                    subscriber.sendUpdate({
                        ticker: normalizedTicker,
                        price: activeTicker.lastPrice,
                        timestamp: new Date()
                    });
                }
                catch (error) {
                    console.error(`Error sending initial update to subscriber for ${normalizedTicker}:`, error);
                    this.unsubscribe(normalizedTicker, subscriber);
                }
            }
        }
        catch (error) {
            console.error(`❌ Failed to subscribe to ${normalizedTicker}:`, error);
            throw error;
        }
    }
    unsubscribe(ticker, subscriber) {
        const normalizedTicker = ticker.toUpperCase();
        const activeTicker = this.activeTickers.get(normalizedTicker);
        if (activeTicker) {
            if (activeTicker.subscribers.has(subscriber)) {
                activeTicker.subscribers.delete(subscriber);
                console.log(`Removed subscriber for ${normalizedTicker}. Remaining subscribers: ${activeTicker.subscribers.size}`);
                if (activeTicker.subscribers.size === 0) {
                    this.stopPolling(normalizedTicker);
                    this.activeTickers.delete(normalizedTicker);
                    console.log(`Stopped polling for ${normalizedTicker} - no more subscribers`);
                }
            }
            else {
                console.log(`Subscriber not found for ${normalizedTicker} during unsubscribe`);
            }
        }
    }
    async removeTicker(ticker) {
        const normalizedTicker = ticker.toUpperCase();
        const activeTicker = this.activeTickers.get(normalizedTicker);
        if (activeTicker) {
            console.log(`🧹 Removing ticker ${normalizedTicker} and cleaning up resources`);
            this.stopPolling(normalizedTicker);
            activeTicker.subscribers.clear();
            this.activeTickers.delete(normalizedTicker);
            try {
                await this.scraper.closeTickerPage(normalizedTicker);
                console.log(`✅ Closed Playwright tab for ${normalizedTicker}`);
            }
            catch (error) {
                console.error(`❌ Error closing Playwright tab for ${normalizedTicker}:`, error);
            }
            console.log(`✅ Fully removed ticker ${normalizedTicker}`);
        }
    }
    async ensureInitialized() {
        if (!this.isScraperInitialized) {
            await this.initialize();
        }
    }
    async startPolling(ticker) {
        const activeTicker = this.activeTickers.get(ticker);
        if (!activeTicker || activeTicker.intervalId) {
            return;
        }
        console.log(`Starting polling for ${ticker}`);
        let shouldStopPolling = false;
        const poll = async () => {
            if (shouldStopPolling) {
                this.stopPolling(ticker);
                return;
            }
            try {
                const priceData = await this.scraper.getPrice(ticker);
                activeTicker.lastPrice = priceData.price;
                this.broadcastUpdate(priceData);
            }
            catch (error) {
                console.error(`Error polling ${ticker}:`, error);
                if (error instanceof Error && (error.message.includes('404') || error.message.includes('not found'))) {
                    console.error(`❌ Ticker ${ticker} not found, stopping polling`);
                    shouldStopPolling = true;
                    this.stopPolling(ticker);
                    this.activeTickers.delete(ticker);
                    await this.scraper.closeTickerPage(ticker);
                    this.notifySubscribersOfError(ticker, `Ticker ${ticker} not found`);
                    throw new Error(`Ticker ${ticker} not found on TradingView`);
                }
            }
        };
        try {
            await poll();
            if (this.activeTickers.has(ticker) && !shouldStopPolling) {
                activeTicker.intervalId = setInterval(poll, this.UPDATE_INTERVAL);
            }
        }
        catch (error) {
            console.error(`Failed initial poll for ${ticker}:`, error);
        }
    }
    stopPolling(ticker) {
        const activeTicker = this.activeTickers.get(ticker);
        if (activeTicker && activeTicker.intervalId) {
            clearInterval(activeTicker.intervalId);
            activeTicker.intervalId = null;
            console.log(`Stopped polling for ${ticker}`);
        }
    }
    notifySubscribersOfError(ticker, errorMessage) {
        const activeTicker = this.activeTickers.get(ticker);
        if (activeTicker) {
            const subscribers = Array.from(activeTicker.subscribers);
            subscribers.forEach(subscriber => {
                try {
                    subscriber.sendUpdate({
                        ticker,
                        price: -404,
                        timestamp: new Date()
                    });
                    console.error(`Error for ${ticker}: ${errorMessage}`);
                }
                catch (subError) {
                    console.error(`Error notifying subscriber:`, subError);
                }
            });
            activeTicker.subscribers.clear();
        }
    }
    broadcastUpdate(priceData) {
        const activeTicker = this.activeTickers.get(priceData.ticker);
        if (activeTicker) {
            const subscribers = Array.from(activeTicker.subscribers);
            console.log(`Broadcasting update for ${priceData.ticker}: $${priceData.price} to ${subscribers.length} subscribers`);
            subscribers.forEach(subscriber => {
                try {
                    subscriber.sendUpdate(priceData);
                }
                catch (error) {
                    console.error(`Error sending update to subscriber for ${priceData.ticker}:`, error);
                    this.unsubscribe(priceData.ticker, subscriber);
                }
            });
        }
    }
    getActiveTickers() {
        return Array.from(this.activeTickers.keys()).sort();
    }
    getSubscriberCount(ticker) {
        const normalizedTicker = ticker.toUpperCase();
        const activeTicker = this.activeTickers.get(normalizedTicker);
        return activeTicker ? activeTicker.subscribers.size : 0;
    }
    async shutdown() {
        console.log('Shutting down PriceManager...');
        this.activeTickers.forEach((_, ticker) => {
            this.stopPolling(ticker);
        });
        this.activeTickers.clear();
        await this.scraper.close();
        this.isScraperInitialized = false;
        console.log('PriceManager shutdown complete');
    }
}
let priceManagerInstance = null;
export function getPriceManager() {
    if (!priceManagerInstance) {
        priceManagerInstance = new PriceManager();
    }
    return priceManagerInstance;
}
export async function cleanupPriceManager() {
    if (priceManagerInstance) {
        await priceManagerInstance.shutdown();
        priceManagerInstance = null;
    }
}
process.on('SIGINT', cleanupPriceManager);
process.on('SIGTERM', cleanupPriceManager);
process.on('exit', cleanupPriceManager);
//# sourceMappingURL=price-manager.js.map