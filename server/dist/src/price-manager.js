import { getScraper } from './scraper';
export class PriceManager {
    activeTickers = new Map();
    scraper = getScraper();
    isScraperInitialized = false;
    UPDATE_INTERVAL = 2000;
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
            subscriber.sendUpdate({
                ticker: normalizedTicker,
                price: activeTicker.lastPrice,
                timestamp: new Date()
            });
        }
    }
    unsubscribe(ticker, subscriber) {
        const normalizedTicker = ticker.toUpperCase();
        const activeTicker = this.activeTickers.get(normalizedTicker);
        if (activeTicker) {
            activeTicker.subscribers.delete(subscriber);
            console.log(`Removed subscriber for ${normalizedTicker}. Remaining subscribers: ${activeTicker.subscribers.size}`);
            if (activeTicker.subscribers.size === 0) {
                this.stopPolling(normalizedTicker);
                this.activeTickers.delete(normalizedTicker);
                console.log(`Stopped polling for ${normalizedTicker} - no more subscribers`);
            }
        }
    }
    async startPolling(ticker) {
        const activeTicker = this.activeTickers.get(ticker);
        if (!activeTicker || activeTicker.intervalId) {
            return;
        }
        console.log(`Starting polling for ${ticker}`);
        const poll = async () => {
            try {
                const priceData = await this.scraper.getPrice(ticker);
                activeTicker.lastPrice = priceData.price;
                this.broadcastUpdate(priceData);
            }
            catch (error) {
                console.error(`Error polling ${ticker}:`, error);
            }
        };
        await poll();
        activeTicker.intervalId = setInterval(poll, this.UPDATE_INTERVAL);
    }
    stopPolling(ticker) {
        const activeTicker = this.activeTickers.get(ticker);
        if (activeTicker && activeTicker.intervalId) {
            clearInterval(activeTicker.intervalId);
            activeTicker.intervalId = null;
            console.log(`Stopped polling for ${ticker}`);
        }
    }
    broadcastUpdate(priceData) {
        const activeTicker = this.activeTickers.get(priceData.ticker);
        if (activeTicker) {
            console.log(`Broadcasting update for ${priceData.ticker}: $${priceData.price} to ${activeTicker.subscribers.size} subscribers`);
            activeTicker.subscribers.forEach(subscriber => {
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