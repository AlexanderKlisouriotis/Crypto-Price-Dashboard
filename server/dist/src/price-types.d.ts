export interface SubscribeRequest {
    ticker: string;
}
export interface PriceUpdate {
    ticker: string;
    price: number;
}
export declare const PriceService: {
    typeName: string;
    methods: {
        subscribe: {
            name: string;
            kind: "server_streaming";
            I: {
                $type: string;
            };
            O: {
                $type: string;
            };
        };
    };
};
