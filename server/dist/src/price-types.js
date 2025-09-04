export const PriceService = {
    typeName: 'project_pluto.price.PriceService',
    methods: {
        subscribe: {
            name: 'Subscribe',
            kind: 'server_streaming',
            I: { $type: 'project_pluto.price.SubscribeRequest' },
            O: { $type: 'project_pluto.price.PriceUpdate' }
        }
    }
};
//# sourceMappingURL=price-types.js.map