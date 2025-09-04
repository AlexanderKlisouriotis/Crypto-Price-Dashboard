import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { PriceService } from '../../../server/gen/proto/price_pb';

const isBrowser = typeof window !== 'undefined';

const transport = createConnectTransport({
  baseUrl: isBrowser ? '/api' : 'http://localhost:8080',
  useBinaryFormat: false,
});

export const priceClient = createClient(PriceService, transport);

// Mock client for SSR
export const mockPriceClient = {
  subscribe: async function* () {
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      yield null;
    }
  }
};