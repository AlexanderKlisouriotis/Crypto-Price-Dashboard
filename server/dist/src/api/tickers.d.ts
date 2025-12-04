import { IncomingMessage, ServerResponse } from 'http';
export declare function handleTickerRemoval(req: IncomingMessage, res: ServerResponse): Promise<void>;
export declare function handleHealthCheck(req: IncomingMessage, res: ServerResponse): Promise<void>;
