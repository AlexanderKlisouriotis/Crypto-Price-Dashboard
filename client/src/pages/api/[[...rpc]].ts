import { nextJsApiRouter } from '@connectrpc/connect-next';
import { PriceService } from '../../../../server/gen/proto/price_pb';
import { createConnectTransport } from '@connectrpc/connect-node';
import { createClient } from '@connectrpc/connect';
import { NextApiRequest, NextApiResponse } from 'next';

// Create transport to your backend server with correct content type
const backendTransport = createConnectTransport({
  baseUrl: 'http://localhost:8080',
  httpVersion: '1.1',
  useBinaryFormat: false, // This is likely what your server expects
});

const backendClient = createClient(PriceService, backendTransport);

// Create the ConnectRPC router
const { handler } = nextJsApiRouter({
  routes: (router) => {
    router.service(PriceService, {
      async *subscribe(request) {
        console.log('🔁 Frontend API route received request for ticker:', request.ticker);
        
        try {
          const stream = backendClient.subscribe(request);
          
          for await (const update of stream) {
            console.log('📨 Forwarding update:', update.ticker, update.price);
            yield update;
          }
        } catch (error) {
          console.error('❌ Error in API route proxy:', error);
          throw new Error(`Failed to proxy request: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    });
  },
});

// Export as default handler for Next.js
export default function handleRequest(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res);
}


// Configure API route
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
    externalResolver: true,
  },
};