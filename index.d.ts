declare module 'winston-elasticsearch' {
  import Elasticsearch from 'elasticsearch';
  import TransportStream from 'winston-transport';

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
    waitForActiveShards?: number;
    handleExceptions?: boolean;
    pipeline?: string;
    client?: Elasticsearch.Client;
    clientOpts?: Elasticsearch.ConfigOptions;
    buffering?: boolean;
    bufferLimit?: number;
  }

  export default class ElasticsearchTransport extends TransportStream {
    constructor(opts?: ElasticsearchTransportOptions);

    query<T>(options: any, callback?: () => void): Promise<Elasticsearch.SearchResponse<T>>;
    query<T>(q: string): Promise<Elasticsearch.SearchResponse<T>>;
    getIndexName(opts: ElasticsearchTransportOptions): string;
  }
}
