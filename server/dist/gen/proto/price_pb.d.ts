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
export declare const PriceService: GenService<{
    subscribe: {
        methodKind: "server_streaming";
        input: typeof SubscribeRequestSchema;
        output: typeof PriceUpdateSchema;
    };
}>;
