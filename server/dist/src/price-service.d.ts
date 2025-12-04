import { SubscribeRequest, PriceUpdate, RemoveTickerRequest, RemoveTickerResponse } from '../gen/proto/price_pb';
export declare const priceServiceImpl: {
    subscribe(request: SubscribeRequest): AsyncGenerator<PriceUpdate, void, unknown>;
    removeTickerMethod(req: RemoveTickerRequest, context: any): Promise<RemoveTickerResponse>;
};
