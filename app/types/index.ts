export interface NamespaceInput {
  'namespace-name': string;
  'namespace-url': string;
}

export interface Namespace extends NamespaceInput {
  'namespace-id': string;
  'namespace-accounts': NamespaceAccount[];
  'namespace-methods': NamespaceMethod[];
}

export interface NamespaceAccount {
  'namespace-id': string;
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-account-url-override'?: string;
  'namespace-account-header'?: Header[];
}

export interface NamespaceMethod {
  'namespace-id': string;
  'method-id': string;
  'namespace-account-method-name': string;
  'namespace-account-method-type': 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  'namespace-account-method-url-override'?: string;
  'namespace-account-method-queryParams'?: QueryParam[];
  'namespace-account-method-header'?: Header[];
  'sample-request'?: any;
  'sample-response'?: any;
  'request-schema'?: any;
  'response-schema'?: any;
  'save-data'?: boolean;
}

interface Header {
  key: string;
  value: string;
}

interface QueryParam {
  key: string;
  value: string;
} 

export interface KeyValuePair {
  key: string;
  value: string;
} 