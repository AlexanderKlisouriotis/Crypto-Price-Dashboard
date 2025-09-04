// Simple manual types - no code generation needed!
export interface SubscribeRequest {
  ticker: string;
}

export interface PriceUpdate {
  ticker: string;
  price: number;
}

export const PriceService = {
  typeName: 'project_pluto.price.PriceService',
  methods: {
    subscribe: {
      name: 'Subscribe',
      kind: 'server_streaming' as const,
      I: { $type: 'project_pluto.price.SubscribeRequest' },
      O: { $type: 'project_pluto.price.PriceUpdate' }
    }
  }
};