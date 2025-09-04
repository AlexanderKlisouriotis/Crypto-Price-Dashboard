export declare const priceServiceImpl: {
    subscribe(request: {
        ticker: string;
    }): AsyncGenerator<{
        ticker: string;
        price: number;
    }, never, unknown>;
};
