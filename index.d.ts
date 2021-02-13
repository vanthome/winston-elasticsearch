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
  dataStream?: boolean;
  apm?: any; // typeof Agent;
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
  healthCheckTimeout?: string;
  healthCheckWaitForStatus?: string;
  healthCheckWaitForNodes?: string;
}

export class ElasticsearchTransport extends TransportStream {
  constructor(opts?: ElasticsearchTransportOptions);
  flush(): Promise<any>;

  query<T>(options: any, callback?: () => void): Promise<ApiResponse<T>>;
  query<T>(q: string): Promise<ApiResponse<T>>;
  getIndexName(opts: ElasticsearchTransportOptions): string;
}
