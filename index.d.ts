declare module 'winston-elasticsearch' {
  import { Client, ClientOptions, ApiResponse } from '@elastic/elasticsearch';
  import TransportStream = require('winston-transport');

  export interface LogData {
    message: any;
    level: string;
    meta: { [key: string]: any };
    timestamp?: string;
  }

  export interface Transformer {
    (logData: LogData): any;
  }

  export interface ElasticsearchTransportOptions extends TransportStream.TransportStreamOptions {
    timestamp?: () => string;
    level?: string;
    index?: string;
    indexPrefix?: string;
    indexSuffixPattern?: string;
    messageType?: string;
    transformer?: Transformer;
    mappingTemplate?: { [key: string]: any };
    ensureMappingTemplate?: boolean;
    flushInterval?: number;
    waitForActiveShards?: number | 'all';
    handleExceptions?: boolean;
    pipeline?: string;
    client?: Client;
    clientOpts?: ClientOptions;
    buffering?: boolean;
    bufferLimit?: number;
  }

  export default class ElasticsearchTransport extends TransportStream {
    constructor(opts?: ElasticsearchTransportOptions);

    query<T>(options: any, callback?: () => void): Promise<ApiResponse<T>>;
    query<T>(q: string): Promise<ApiResponse<T>>;
    getIndexName(opts: ElasticsearchTransportOptions): string;
  }
}
