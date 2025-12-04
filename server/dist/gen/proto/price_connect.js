import { MethodKind } from "@bufbuild/protobuf";
export const PriceService = {
    typeName: "project_pluto.price.PriceService",
    methods: {
        subscribe: {
            name: "Subscribe",
            I: SubscribeRequest,
            O: PriceUpdate,
            kind: MethodKind.ServerStreaming,
        },
        removeTicker: {
            name: "RemoveTicker",
            I: RemoveTickerRequest,
            O: RemoveTickerResponse,
            kind: MethodKind.Unary,
        },
    }
};
//# sourceMappingURL=price_connect.js.map