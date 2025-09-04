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
    }
};
//# sourceMappingURL=price_connect.js.map