import { PriceData } from './scraper';
interface PriceSubscriber {
    sendUpdate: (data: PriceData) => void;
    ticker: string;
}
export declare class PriceManager {
    private activeTickers;
    private scraper;
    private isScraperInitialized;
    private readonly UPDATE_INTERVAL;
    initialize(): Promise<void>;
    subscribe(ticker: string, subscriber: PriceSubscriber): Promise<void>;
    unsubscribe(ticker: string, subscriber: PriceSubscriber): void;
    private startPolling;
    private stopPolling;
    private broadcastUpdate;
    getActiveTickers(): string[];
    getSubscriberCount(ticker: string): number;
    shutdown(): Promise<void>;
}
export declare function getPriceManager(): PriceManager;
export declare function cleanupPriceManager(): Promise<void>;
export {};
