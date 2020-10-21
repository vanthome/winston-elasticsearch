import Agent from 'elastic-apm-node';
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
  apm: typeof Agent;
  timestamp?: () => string;
  level?: string;
  index?: string;
  indexPrefix?: string;
  indexSuffixPattern?: string;
  messageType?: string;
  transformer?: Transformer;
  mappingTemplate?: { [key: string]: any };
  ensureMappingTemplate?: boolean;
  elasticsearchVersion?: number;
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
