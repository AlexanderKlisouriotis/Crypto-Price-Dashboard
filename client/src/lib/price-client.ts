import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { PriceService } from '../../../server/gen/proto/price_pb';

const isBrowser = typeof window !== 'undefined';

const transport = createConnectTransport({
  baseUrl: isBrowser ? '/api' : 'http://localhost:8080',
  useBinaryFormat: true,
  interceptors: [
    (next) => async (req) => {
      console.log('🔍 Client sending request:', req.method.name);
      try {
        const response = await next(req);
        console.log('✅ Client received response:', response);
        return response;
      } catch (error) {
        console.error('❌ Client request failed:', error);
        throw error;
      }
    }
  ]
});

export const priceClient = createClient(PriceService, transport);
