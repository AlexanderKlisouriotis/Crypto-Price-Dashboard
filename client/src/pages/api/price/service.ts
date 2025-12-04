import { nextJsApiRouter } from '@connectrpc/connect-next';
import { PriceService } from '../../../../../server/gen/proto/price_pb';
import { priceServiceImpl } from '../../../../../server/src/price-service';


// Create API handler
export default nextJsApiRouter({
  routes: (router) => {
    router.service(PriceService, priceServiceImpl);
  },
});