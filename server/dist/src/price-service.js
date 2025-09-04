import { getScraper } from './scraper';
export const priceServiceImpl = {
    async *subscribe(request) {
        const ticker = request.ticker.toUpperCase();
        console.log(`📡 Starting REAL TradingView scraping for: ${ticker}`);
        const scraper = getScraper();
        try {
            if (!scraper.isInitialized) {
                console.log('🔄 Scraper not initialized, initializing now...');
                await scraper.initialize();
            }
            console.log('🔄 Initializing Playwright browser...');
            await scraper.initialize();
            console.log('✅ Playwright browser initialized');
            let errorCount = 0;
            const MAX_ERRORS = 5;
            while (true) {
                try {
                    console.log(`🌐 Scraping real-time price for ${ticker}...`);
                    const priceData = await scraper.getPrice(ticker);
                    console.log(`✅ Real price obtained for ${ticker}: $${priceData.price}`);
                    yield {
                        ticker: ticker,
                        price: priceData.price
                    };
                    errorCount = 0;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                catch (scrapeError) {
                    errorCount++;
                    console.error(`❌ Scraping error for ${ticker} (attempt ${errorCount}/${MAX_ERRORS}):`, scrapeError instanceof Error ? scrapeError.message : String(scrapeError));
                    if (errorCount >= MAX_ERRORS) {
                        throw new Error(`Failed to scrape ${ticker} after ${MAX_ERRORS} attempts`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
        catch (error) {
            if (error instanceof Error) {
                console.error(`❌ Fatal error in ${ticker} feed:`, error.message);
                throw new Error(`Failed to stream prices for ${ticker}: ${error.message}`);
            }
            else {
                console.error(`❌ Unknown fatal error in ${ticker} feed:`, error);
                throw new Error(`Unexpected error occurred while streaming ${ticker} prices`);
            }
        }
    }
};
//# sourceMappingURL=price-service.js.map