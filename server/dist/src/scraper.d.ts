export interface PriceData {
    ticker: string;
    price: number;
    timestamp: Date;
}
export declare class TradingViewScraper {
    private browser;
    private context;
    private pages;
    isInitialized: boolean;
    private activeSubscriptions;
    initialize(): Promise<void>;
    setupTickerPage(ticker: string): Promise<void>;
    subscribeToTicker(ticker: string): Promise<AsyncIterable<PriceData>>;
    private createPriceStream;
    getPrice(ticker: string): Promise<PriceData>;
    close(): Promise<void>;
}
export declare function getScraper(): TradingViewScraper;
export declare function cleanupScraper(): Promise<void>;
