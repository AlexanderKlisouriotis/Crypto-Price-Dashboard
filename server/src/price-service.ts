import { Code, ConnectError } from '@connectrpc/connect';
import { SubscribeRequest, PriceUpdate, RemoveTickerRequest, RemoveTickerResponse, SubscribeRequestSchema, PriceUpdateSchema, RemoveTickerRequestSchema, RemoveTickerResponseSchema } from '../gen/proto/price_pb';
import { getPriceManager } from './price-manager';
import { PriceData } from './scraper';

export const priceServiceImpl = {
  async *subscribe(request: SubscribeRequest) {
    const ticker = request.ticker.toUpperCase();
    console.log(`📡 Starting subscription for: ${ticker}`);
    
    const priceManager = getPriceManager();
    
    try {
      await priceManager.ensureInitialized();

      const updates: PriceData[] = [];
      let newUpdateCallback: ((data: PriceData) => void) | null = null;
      let isActive = true;

      const subscriber = {
        ticker,
        sendUpdate: (data: PriceData) => {
          if (!isActive) return;
          
          if (newUpdateCallback) {
            newUpdateCallback(data);
            newUpdateCallback = null;
          } else {
            updates.push(data);
          }
        }
      };

      try {
        await priceManager.subscribe(ticker, subscriber);
      } catch(error) {
        console.error(`❌ Subscription failed for ${ticker}:`, error);
        
        // CONVERT TO CONNECTERROR INSTEAD OF THROWING RAW ERROR
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ConnectError(`Ticker ${ticker} not found on TradingView`, Code.NotFound);
        }
        throw new ConnectError(`Failed to subscribe to ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`, Code.Internal);
      }
      
      try {
        while (isActive) {
          const nextUpdate = await new Promise<PriceData>((resolve, reject) => {
            if (updates.length > 0) {
              resolve(updates.shift()!);
            } else {
              newUpdateCallback = resolve;
              
              setTimeout(() => {
                if (newUpdateCallback === resolve) {
                  newUpdateCallback = null;
                  resolve({
                    ticker,
                    price:-404,
                    timestamp: new Date()
                  });
                }
              }, 5000);
            }
          });
          if(nextUpdate.price !== -404){
          const response: PriceUpdate = {
            ticker: nextUpdate.ticker,
            price: nextUpdate.price,
            $typeName: 'project_pluto.price.PriceUpdate'
          };

          yield response;
        }
        }
      } finally {
        isActive = false;
        priceManager.unsubscribe(ticker, subscriber);
        console.log(`📡 Ended subscription for ${ticker}`);
      }
      
    } catch (error) {
      console.error(`❌ Error in ${ticker} subscription:`, error);
      // RE-THROW CONNECTERRORS AS-IS, WRAP OTHERS
      if (error instanceof ConnectError) {
        throw error;
      }
      throw new ConnectError(`Internal server error for ${ticker}`, Code.Internal);
    }
  },

  async removeTickerMethod(req: RemoveTickerRequest, context: any): Promise<RemoveTickerResponse> {
     console.log('🔄 removeTicker method CALLED with:', req);
    const ticker = req.ticker.toUpperCase();
    console.log(`🗑️ ConnectRPC removing ticker: ${ticker}`);
    
    try {
      const priceManager = getPriceManager();
      
      await priceManager.removeTicker(ticker);
      
      
      const response: RemoveTickerResponse = {
        success: true,
        message: `Successfully removed ${ticker} and closed Playwright tab`,
        $typeName: 'project_pluto.price.RemoveTickerResponse' 
      };
      
      return response;
    } catch (error) {
      console.error(`❌ Error removing ticker ${ticker}:`, error);
      const response: RemoveTickerResponse = {
        success: false,
        message: `Failed to remove ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        $typeName: 'project_pluto.price.RemoveTickerResponse'
      };
      return response;
    }
  }
};