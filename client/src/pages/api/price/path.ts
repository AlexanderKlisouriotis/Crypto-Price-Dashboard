import { NextApiRequest, NextApiResponse } from 'next';
import { createConnectTransport } from '@connectrpc/connect-node';
import { PriceService } from '../../../../../server/gen/proto/price_pb';
import { createClient } from '@connectrpc/connect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create a connection to the backend server
  const transport = createConnectTransport({
    baseUrl: 'http://localhost:8080',
    httpVersion: '1.1',
  });

  const client = createClient(PriceService, transport);

  try {
    // Handle different HTTP methods
    if (req.method === 'POST') {
      // Handle streaming requests
      res.setHeader('Content-Type', 'application/connect+json');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Here you would forward the request to the backend
      // This is a simplified example
      res.status(200).json({ message: 'Proxied to backend' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}