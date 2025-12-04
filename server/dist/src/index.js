import { connectNodeAdapter, createConnectTransport } from '@connectrpc/connect-node';
import { createServer } from 'http';
import { PriceService } from '../gen/proto/price_pb';
import { priceServiceImpl } from './price-service';
import { getScraper } from './scraper';
import { createClient, createConnectRouter } from '@connectrpc/connect';
async function main() {
    console.log('Starting Project Pluto Price Server...');
    console.log('🔄 Initializing Playwright browser...');
    const scraper = getScraper();
    await scraper.initialize();
    console.log('✅ Playwright browser initialized and visible');
    const adapter = connectNodeAdapter({
        routes: (router) => {
            console.log('🔍 Registering PriceService methods:');
            router.service(PriceService, {
                subscribe: priceServiceImpl.subscribe,
                removeTicker: priceServiceImpl.removeTickerMethod
            });
        },
        connect: true,
        grpc: false,
        grpcWeb: false,
    });
    const server = createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, *');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Connect-Protocol-Version');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        console.log(`📨 Incoming ${req.method} request to: ${req.url}`);
        if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
        }
        if (req.url === '/health' && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                status: 'ok',
                service: 'price-server',
                timestamp: new Date().toISOString()
            }));
            return;
        }
        adapter(req, res);
    });
    server.listen(8080, () => {
        console.log('✅ Server running on http://localhost:8080');
        console.log('✅ Health endpoint: http://localhost:8080/health');
        testRemoveTicker();
    });
    const router = createConnectRouter();
    router.service(PriceService, priceServiceImpl);
    const shutdown = async () => {
        console.log('Shutting down server...');
        server.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
async function testRemoveTicker() {
    try {
        const transport = createConnectTransport({
            baseUrl: 'http://localhost:8080',
            httpVersion: '1.1',
        });
        const testClient = createClient(PriceService, transport);
        console.log('🧪 Testing removeTicker method directly...');
        const response = await testClient.removeTicker({ ticker: 'TEST' });
        console.log('✅ removeTicker test response:', response);
    }
    catch (error) {
        console.error('❌ removeTicker test failed:', error);
    }
}
main().catch(console.error);
//# sourceMappingURL=index.js.map