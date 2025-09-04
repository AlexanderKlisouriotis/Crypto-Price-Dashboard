import { connectNodeAdapter } from '@connectrpc/connect-node';
import { createServer } from 'http';
import { PriceService } from '../gen/proto/price_pb';
import { priceServiceImpl } from './price-service';
import { getScraper } from './scraper';

async function main() {
  console.log('Starting Project Pluto Price Server...');


  console.log('🔄 Initializing Playwright browser...');
  const scraper = getScraper();
  await scraper.initialize();
  console.log('✅ Playwright browser initialized and visible');

  // Create ConnectRPC adapter
  const adapter = connectNodeAdapter({
    routes: (router) => {
      router.service(PriceService, priceServiceImpl);
    },
    connect: true,
    grpc: false,
    grpcWeb: false,
  });

  // Create HTTP server with proper request handling
  const server = createServer((req, res) => {

    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    console.log(`📨 Incoming request: ${req.method} ${req.url}`);
    // Handle health endpoint separately
    if (req.url === '/health' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        status: 'ok', 
        service: 'price-server',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Handle OPTIONS requests for CORS
    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
  }

    // Add CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Let ConnectRPC handle all other requests
    adapter(req, res);
  });

  // Start the server
  server.listen(8080, () => {
    console.log('✅ Server running on http://localhost:8080');
    console.log('✅ Health endpoint: http://localhost:8080/health');
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down server...');
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(console.error);