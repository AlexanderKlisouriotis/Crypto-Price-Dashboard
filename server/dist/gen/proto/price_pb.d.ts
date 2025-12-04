import type { GenFile, GenMessage, GenService } from "@bufbuild/protobuf/codegenv2";
import type { Message } from "@bufbuild/protobuf";
export declare const file_proto_price: GenFile;
export type SubscribeRequest = Message<"project_pluto.price.SubscribeRequest"> & {
    ticker: string;
};
export declare const SubscribeRequestSchema: GenMessage<SubscribeRequest>;
export type PriceUpdate = Message<"project_pluto.price.PriceUpdate"> & {
    ticker: string;
    price: number;
};
export declare const PriceUpdateSchema: GenMessage<PriceUpdate>;
export type RemoveTickerRequest = Message<"project_pluto.price.RemoveTickerRequest"> & {
    ticker: string;
};
export declare const RemoveTickerRequestSchema: GenMessage<RemoveTickerRequest>;
export type RemoveTickerResponse = Message<"project_pluto.price.RemoveTickerResponse"> & {
    success: boolean;
    message: string;
};
export declare const RemoveTickerResponseSchema: GenMessage<RemoveTickerResponse>;
export declare const PriceService: GenService<{
    subscribe: {
        methodKind: "server_streaming";
        input: typeof SubscribeRequestSchema;
        output: typeof PriceUpdateSchema;
    };
    removeTicker: {
        methodKind: "unary";
        input: typeof RemoveTickerRequestSchema;
        output: typeof RemoveTickerResponseSchema;
    };
}>;
