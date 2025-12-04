import { URL } from 'url';
import { getPriceManager } from '../price-manager';
export async function handleTickerRemoval(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }
    if (req.method !== 'DELETE') {
        res.statusCode = 405;
        res.setHeader('Allow', 'DELETE, OPTIONS');
        res.end(JSON.stringify({ error: `Method ${req.method} Not Allowed` }));
        return;
    }
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const ticker = url.pathname.split('/').pop();
        if (!ticker) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Ticker symbol is required' }));
            return;
        }
        console.log(`🗑️ Server removing ticker: ${ticker}`);
        const priceManager = getPriceManager();
        await priceManager.removeTicker(ticker);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            success: true,
            message: `Successfully removed ${ticker} and closed Playwright tab`
        }));
    }
    catch (error) {
        console.error('❌ Error in ticker removal:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            success: false,
            error: `Failed to remove ticker: ${error instanceof Error ? error.message : 'Unknown error'}`
        }));
    }
}
export async function handleHealthCheck(req, res) {
    if (req.method === 'GET' && req.url === '/health') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString()
        }));
    }
}
//# sourceMappingURL=tickers.js.map