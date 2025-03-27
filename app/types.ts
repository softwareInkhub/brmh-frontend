export interface NamespaceMethod {
  'method-id': string;
  'namespace-id': string;
  'namespace-account-method-name': string;
  'namespace-account-method-type': 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  'namespace-account-method-url-override'?: string;
  'namespace-account-method-queryParams'?: Array<{ key: string; value: string }>;
  'namespace-account-method-header'?: Array<{ key: string; value: string }>;
  'sample-request'?: string;
  'sample-response'?: string;
  'request-schema'?: string;
  'response-schema'?: string;
  'save-data'?: boolean;
  isInitialized?: boolean;
  tags: string[];
}

export interface NamespaceAccount {
  'namespace-id': string;
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-account-url-override': string;
  'namespace-account-header': Array<{ key: string; value: string }>;
  'token': string;
  'variables': Array<{ key: string; value: string }>;
  tags: string[];
}

export interface Namespace {
  'namespace-id': string;
  'namespace-name': string;
  'namespace-url': string;
  'namespace-accounts': NamespaceAccount[];
  'namespace-methods': any[];
  tags: string[];
}

export interface NamespaceInput {
  'namespace-name': string;
  'namespace-url': string;
  tags: string[];
} 