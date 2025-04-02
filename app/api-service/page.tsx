'use client';

import React, { useState, useEffect } from 'react';
import { Send, RefreshCw, Copy, Download, Check, Clock, X, Trash2, ChevronRight, ChevronDown, Code, Minimize2, Maximize2, Database, Globe, Edit2 } from 'react-feather';
import { useRouter } from 'next/navigation';

interface KeyValuePair {
  key: string;
  value: string;
}

interface Namespace {
  'namespace-id': string;
  'namespace-name': string;
  'namespace-url': string;
  'namespace-accounts': NamespaceAccount[];
  'namespace-methods': NamespaceMethod[];
}

interface NamespaceAccount {
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-account-url-override'?: string;
  'namespace-account-header': KeyValuePair[];
}

interface NamespaceMethod {
  'namespace-method-id': string;
  'namespace-method-name': string;
  'namespace-method-type': string;
  'namespace-method-url-override'?: string;
  'namespace-method-queryParams': KeyValuePair[];
  'namespace-method-header': KeyValuePair[];
  'save-data': boolean;
}

interface ExecuteRequest {
  method: string;
  url: string;
  namespaceAccountId: string;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  maxIterations?: number;
  paginationType?: string;
  paginationConfig?: {
    limitParam: string;
    pageParam: string;
    defaultLimit: string;
  };
  body?: any;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  namespaceAccountId?: string;
  request: {
    queryParams: Record<string, string>;
    headers: Record<string, string>;
    body?: any;
  };
  response: {
    status: number;
    body: any;
    headers: Record<string, string>;
  };
}

// Add this new interface after the existing interfaces
interface Execution {
  'exec-id': string;
  'child-exec-id': string;
  data: {
    'execution-id': string;
    'iteration-no': number;
    'total-items-processed': number;
    'items-in-current-page': number;
    'request-url': string;
    'response-status': number;
    'pagination-type': string;
    'timestamp': string;
    'status': string[];
    'is-last': boolean;
  };
}

// Add JSONTree component at the top level
const JSONTree = ({ data, initialExpanded = true }: { data: any; initialExpanded?: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  
  if (typeof data !== 'object' || data === null) {
    return <span className="text-gray-800">{JSON.stringify(data)}</span>;
  }

  const isArray = Array.isArray(data);
  const items = isArray ? data : Object.entries(data);
  const isEmpty = isArray ? data.length === 0 : Object.keys(data).length === 0;

  if (isEmpty) {
    return <span className="text-gray-500">{isArray ? '[]' : '{}'}</span>;
  }

  return (
    <div className="pl-4">
      <div 
        className="flex items-center gap-1 cursor-pointer hover:text-blue-600" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown size={16} className="shrink-0" />
        ) : (
          <ChevronRight size={16} className="shrink-0" />
        )}
        <span className="text-gray-500">{isArray ? '[' : '{'}</span>
      </div>
      
      {isExpanded && (
        <div className="pl-4 border-l border-gray-200">
          {isArray ? (
            items.map((item: any, index: number) => (
              <div key={index} className="py-1">
                <JSONTree data={item} initialExpanded={false} />
                {index < items.length - 1 && <span className="text-gray-400">,</span>}
              </div>
            ))
          ) : (
            items.map(([key, value]: [string, any], index: number) => (
              <div key={key} className="py-1">
                <span className="text-blue-600">&quot;{key}&quot;</span>
                <span className="text-gray-600">: </span>
                <JSONTree data={value} initialExpanded={false} />
                {index < items.length - 1 && <span className="text-gray-400">,</span>}
              </div>
            ))
          )}
        </div>
      )}
      
      <div className="pl-4">
        <span className="text-gray-500">{isArray ? ']' : '}'}</span>
      </div>
    </div>
  );
};

// Add the ExecutionsMonitor component before the main ApiService component


const ApiService = () => {
  const router = useRouter();
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [queryParams, setQueryParams] = useState<KeyValuePair[]>([{ key: '', value: '' }]);
  const [headers, setHeaders] = useState<KeyValuePair[]>([{ key: '', value: '' }]);
  const [maxIterations, setMaxIterations] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [tableName, setTableName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('params');
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'schema'>('body');
  const [requestBody, setRequestBody] = useState<string>('');
  const [methodType, setMethodType] = useState<string>('GET');
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [methodSearchQuery, setMethodSearchQuery] = useState('');

  // Add this type for items
  type ResponseItem = {
    value?: any;
    [key: string]: any;
  };

  // Add types for namespace, account, and method
  type Method = {
    'namespace-method-id': string;
    'namespace-method-name': string;
    'namespace-method-type': string;
    'namespace-method-url-override'?: string;
    'namespace-method-queryParams': KeyValuePair[];
    'namespace-method-header': KeyValuePair[];
    'save-data': boolean;
    [key: string]: any;
  };

  type Account = {
    'namespace-account-id': string;
    'namespace-account-name': string;
    'namespace-account-header': KeyValuePair[];
    [key: string]: any;
  };

  type Namespace = {
    'namespace-id': string;
    'namespace-name': string;
    'namespace-accounts': Account[];
    'namespace-methods': Method[];
    [key: string]: any;
  };

  type Header = KeyValuePair;

  useEffect(() => {
    console.log('Fetching namespaces');
    fetchNamespaces();
    const savedHistory = localStorage.getItem('apiRequestHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const fetchNamespaces = async () => {
    try {
      console.log('Starting to fetch namespaces...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/namespaces`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rawData = await response.json();
      // console.log('Raw API Response:', rawData);

      if (!Array.isArray(rawData)) {
        console.error('Expected array of namespaces, got:', typeof rawData);
        setNamespaces([]);
        return;
      }

      // Transform DynamoDB formatted data - only basic namespace data
      const transformedNamespaces = rawData
        .filter(item => item && item.data)
        .map(item => {
          const data = item.data;
          return {
            'namespace-id': data['namespace-id']?.S || '',
            'namespace-name': data['namespace-name']?.S || '',
            'namespace-url': data['namespace-url']?.S || '',
            'namespace-accounts': [], // Initialize as empty, will be fetched separately
            'namespace-methods': [], // Initialize as empty, will be fetched separately
            'tags': Array.isArray(data['tags']?.L) 
              ? data['tags'].L.map((tag: any) => tag.S || '')
              : []
          };
        })
        .filter(namespace => namespace['namespace-id'] && namespace['namespace-name']);

      // console.log('Transformed namespaces:', transformedNamespaces);
      
      if (transformedNamespaces.length === 0) {
        console.log('No valid namespaces found after transformation');
        setNamespaces([]);
      } else {
        setNamespaces(transformedNamespaces);
        // After setting namespaces, fetch accounts and methods for each namespace
        transformedNamespaces.forEach(namespace => {
          fetchNamespaceAccounts(namespace['namespace-id']);
          fetchNamespaceMethods(namespace['namespace-id']);
        });
      }
    } catch (error) {
      console.error('Error in fetchNamespaces:', error);
      setNamespaces([]);
    }
  };

  const fetchNamespaceAccounts = async (namespaceId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/namespaces/${namespaceId}/accounts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const accountsData = await response.json();
      // console.log(`Accounts for namespace ${namespaceId}:`, accountsData);

      setNamespaces(currentNamespaces => {
        return currentNamespaces.map(namespace => {
          if (namespace['namespace-id'] === namespaceId) {
            return {
              ...namespace,
              'namespace-accounts': accountsData // You'll need to transform this based on your API response
            };
          }
          return namespace;
        });
      });
    } catch (error) {
      console.error(`Error fetching accounts for namespace ${namespaceId}:`, error);
    }
  };

  const fetchNamespaceMethods = async (namespaceId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/namespaces/${namespaceId}/methods`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rawData = await response.json();
      // console.log(`Raw methods data for namespace ${namespaceId}:`, rawData);

      // Transform methods data with correct property names
      const transformedMethods = rawData.map((method: any) => ({
        'namespace-method-id': method['namespace-method-id'] || '',
        'namespace-method-name': method['namespace-method-name'] || '',
        'namespace-method-type': method['namespace-method-type'] || 'GET',
        'namespace-method-url-override': method['namespace-method-url-override'] || '',
        'namespace-method-queryParams': Array.isArray(method['namespace-method-queryParams']) 
          ? method['namespace-method-queryParams']
          : [],
        'namespace-method-header': Array.isArray(method['namespace-method-header'])
          ? method['namespace-method-header']
          : [],
        'save-data': method['save-data'] || false
      }))
      .filter((method: any) => method['namespace-method-id'] && method['namespace-method-name']);

      // console.log(`Transformed methods for namespace ${namespaceId}:`, transformedMethods);

      setNamespaces(currentNamespaces => {
        return currentNamespaces.map(namespace => {
          if (namespace['namespace-id'] === namespaceId) {
            return {
              ...namespace,
              'namespace-methods': transformedMethods
            };
          }
          return namespace;
        });
      });
    } catch (error) {
      console.error(`Error fetching methods for namespace ${namespaceId}:`, error);
    }
  };

  // Helper function to extract DynamoDB values
  const extractDynamoValue = (dynamoObj: any) => {
    if (!dynamoObj) return null;
    if (dynamoObj.S) return dynamoObj.S;
    if (dynamoObj.N) return Number(dynamoObj.N);
    if (dynamoObj.BOOL !== undefined) return dynamoObj.BOOL;
    if (dynamoObj.L) return dynamoObj.L.map(extractDynamoValue);
    if (dynamoObj.M) {
      const result: any = {};
      Object.entries(dynamoObj.M).forEach(([key, value]) => {
        result[key] = extractDynamoValue(value);
      });
      return result;
    }
    return null;
  };

  // Add a debug effect to log namespace state changes
  useEffect(() => {
    console.log('Current namespaces state:', namespaces);
  }, [namespaces]);

  const handleNamespaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNamespace(e.target.value);
    setSelectedAccount('');
    setSelectedMethod('');
    setUrl('');
    setQueryParams([{ key: '', value: '' }]);
    setHeaders([{ key: '', value: '' }]);
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const accountId = e.target.value;
    setSelectedAccount(accountId);
    setSelectedMethod('');
    setUrl('');
    setQueryParams([{ key: '', value: '' }]);
    
    const namespace = namespaces.find(n => n['namespace-id'] === selectedNamespace);
    const account = namespace?.['namespace-accounts'].find(a => a['namespace-account-id'] === accountId);
    if (account) {
      setHeaders(account['namespace-account-header'].length > 0 
        ? account['namespace-account-header'] 
        : [{ key: '', value: '' }]);
    } else {
      setHeaders([{ key: '', value: '' }]);
    }
  };

  const handleMethodTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMethodType(e.target.value);
  };

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const methodId = e.target.value;
    setSelectedMethod(methodId);

    const namespace = namespaces.find(n => n['namespace-id'] === selectedNamespace);
    console.log('Selected namespace:', namespace);
    
    const method = namespace?.['namespace-methods']?.find(m => m['namespace-method-id'] === methodId);
        // console.log('Selected method:', method);
    
    const account = namespace?.['namespace-accounts']?.find(a => a['namespace-account-id'] === selectedAccount);
    // console.log('Selected account:', account);

    if (method && namespace) {
      // Set the method type (GET, POST, etc.)
      setMethodType(method['namespace-method-type'] || 'GET');
      console.log('Setting method type:', method['namespace-method-type'] || 'GET');

      // Build the URL
      let baseUrl = namespace['namespace-url'];
      if (account?.['namespace-account-url-override']) {
        baseUrl = account['namespace-account-url-override'];
      }
      baseUrl = baseUrl.replace(/\/$/, '');
      const methodUrl = method['namespace-method-url-override'] || '';
      const formattedMethodUrl = methodUrl ? (methodUrl.startsWith('/') ? methodUrl : `/${methodUrl}`) : '';
      const finalUrl = `${baseUrl}${formattedMethodUrl}`;
      setUrl(finalUrl);
      console.log('Setting URL:', finalUrl);

      // Set query parameters
      if (Array.isArray(method['namespace-method-queryParams']) && method['namespace-method-queryParams'].length > 0) {
        setQueryParams(method['namespace-method-queryParams'].map(param => ({
          key: param.key || '',
          value: param.value || ''
        })));
        console.log('Setting query params:', method['namespace-method-queryParams']);
      } else {
        setQueryParams([{ key: '', value: '' }]);
      }

      // Merge headers
      const accountHeaders = account?.['namespace-account-header'] || [];
      const methodHeaders = method['namespace-method-header'] || [];
      console.log('Account headers:', accountHeaders);
      console.log('Method headers:', methodHeaders);
      
      const headerMap = new Map<string, string>();
      
      // Add account headers first
      accountHeaders.forEach((header: KeyValuePair) => {
        if (header.key) {
          headerMap.set(header.key, header.value);
        }
      });
      
      // Add/override with method headers
      methodHeaders.forEach((header: KeyValuePair) => {
        if (header.key) {
          headerMap.set(header.key, header.value);
        }
      });
      
      // Convert the merged headers back to array
      const mergedHeaders = Array.from(headerMap.entries()).map(([key, value]) => ({
        key,
        value
      }));
      
      setHeaders(mergedHeaders.length > 0 ? mergedHeaders : [{ key: '', value: '' }]);
      console.log('Setting merged headers:', mergedHeaders);
    }
  };

  const handleAddKeyValuePair = (type: 'queryParams' | 'headers') => {
    if (type === 'queryParams') {
      setQueryParams([...queryParams, { key: '', value: '' }]);
    } else {
      setHeaders([...headers, { key: '', value: '' }]);
    }
  };

  const handleRemoveKeyValuePair = (index: number, type: 'queryParams' | 'headers') => {
    if (type === 'queryParams') {
      setQueryParams(queryParams.filter((_, i) => i !== index));
    } else {
      setHeaders(headers.filter((_, i) => i !== index));
    }
  };

  const handleKeyValueChange = (
    index: number,
    field: 'key' | 'value',
    value: string,
    type: 'queryParams' | 'headers'
  ) => {
    if (type === 'queryParams') {
      const newParams = [...queryParams];
      newParams[index][field] = value;
      setQueryParams(newParams);
    } else {
      const newHeaders = [...headers];
      newHeaders[index][field] = value;
      setHeaders(newHeaders);
    }
  };

  const handleExecute = async (isPaginated: boolean) => {
    if (!url) {
      alert('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setCurrentExecutionId(null); // Reset execution ID at start
    
    try {
      let endpoint = isPaginated
        ? `https://g76kffqf7bexgoagkfry5chicm0pweoc.lambda-url.us-east-1.on.aws/execute/paginated`
        : `https://krjgztn4q3ogcm2f7g3modjtyq0glvfm.lambda-url.us-east-1.on.aws/execute`;  

      // Get namespace and method details for table name and save-data flag
      let tableName = '';
      let saveData = false;
      
      if (selectedNamespace && selectedMethod) {
        const namespace = namespaces.find(n => n['namespace-id'] === selectedNamespace);
        const method = namespace?.['namespace-methods']?.find(m => m['namespace-method-id'] === selectedMethod);
        
        if (namespace && method) {
          // Construct table name from namespace and method
          const namespaceName = namespace['namespace-name'].toLowerCase().replace(/[^a-z0-9]/g, '_');
          const methodName = method['namespace-method-name'].toLowerCase().replace(/[^a-z0-9]/g, '_');
          
          tableName = `${namespaceName}_${methodName}`;
          saveData = method['save-data'] || false;
        }
      }

      const executeRequest = {
        method: methodType,
        url,
        namespaceAccountId: selectedAccount || '',
        queryParams: Object.fromEntries(queryParams.filter(p => p.key).map(p => [p.key, p.value])),
        headers: Object.fromEntries(headers.filter(h => h.key).map(h => [h.key, h.value])),
        ...(isPaginated ? { 
          maxIterations: parseInt(maxIterations) || 10,
          paginationType: 'link',
          paginationConfig: {
            limitParam: 'limit',
            pageParam: 'page_info',
            defaultLimit: '50'
          }
        } : {}),
        ...(activeTab === 'body' && requestBody ? { body: tryParseJSON(requestBody) } : {}),
        // Add table name and save-data flag
        tableName,
        saveData
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(executeRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('API Response:', responseData);

      // Extract execution ID from metadata and set it
      if (responseData.data?.executionId) {
        console.log('Execution ID:', responseData.data.executionId);
        setCurrentExecutionId(responseData.data.executionId);
        // Store execution ID in localStorage for the executions page to access
        localStorage.setItem('currentExecutionId', responseData.data.executionId);
      }

      setResponse({
        body: responseData,
        headers: Object.fromEntries(response.headers.entries()),
        status: response.status,
      });

    } catch (error) {
      console.error('Error executing request:', error);
      setResponse({
        body: { 
          error: 'Failed to execute request',
          details: error instanceof Error ? error.message : String(error)
        },
        headers: {},
        status: 500,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tryParseJSON = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const determineContentType = (body: string) => {
    try {
      JSON.parse(body);
      return 'application/json';
    } catch {
      return 'text/plain';
    }
  };

  const handleCopyResponse = () => {
    let contentToCopy = '';
    switch (responseTab) {
      case 'body':
        contentToCopy = JSON.stringify(response.body, null, 2);
        break;
      case 'headers':
        contentToCopy = JSON.stringify(response.headers, null, 2);
        break;
      case 'schema':
        contentToCopy = JSON.stringify(generateResponseSchema(response.body), null, 2);
        break;
    }
    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadResponse = () => {
    let contentToDownload = '';
    let fileName = '';
    
    switch (responseTab) {
      case 'body':
        contentToDownload = JSON.stringify(response.body, null, 2);
        fileName = 'response-body.json';
        break;
      case 'headers':
        contentToDownload = JSON.stringify(response.headers, null, 2);
        fileName = 'response-headers.json';
        break;
      case 'schema':
        contentToDownload = JSON.stringify(generateResponseSchema(response.body), null, 2);
        fileName = 'response-schema.json';
        break;
    }

    const blob = new Blob([contentToDownload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateResponseSchema = (data: any): any => {
    if (data === null) return { type: 'null' };
    if (Array.isArray(data)) {
      const items = data.length > 0 ? generateResponseSchema(data[0]) : {};
      return {
        type: 'array',
        items
      };
    }
    if (typeof data === 'object') {
      const properties: Record<string, any> = {};
      const required: string[] = [];
      
      Object.entries(data).forEach(([key, value]) => {
        properties[key] = generateResponseSchema(value);
        if (value !== null && value !== undefined) {
          required.push(key);
        }
      });
      
      return {
        type: 'object',
        properties,
        required
      };
    }
    return { type: typeof data };
  };

  const saveToHistory = (requestDetails: ExecuteRequest, responseData: any) => {
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      method: requestDetails.method,
      url: requestDetails.url,
      namespaceAccountId: requestDetails.namespaceAccountId,
      request: {
        queryParams: requestDetails.queryParams,
        headers: requestDetails.headers,
        body: requestDetails.body,
      },
      response: {
        status: responseData.status,
        body: responseData.body,
        headers: responseData.headers,
      },
    };

    const updatedHistory = [newEntry, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem('apiRequestHistory', JSON.stringify(updatedHistory));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('apiRequestHistory');
  };

  const handleDeleteHistoryEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = history.filter(entry => entry.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('apiRequestHistory', JSON.stringify(updatedHistory));
  };

  const loadHistoryEntry = (entry: HistoryEntry) => {
    setMethodType(entry.method);
    setUrl(entry.url);
    
    // Only try to match namespace if the original request used one
    if (entry.namespaceAccountId) {
      // Find matching namespace and account based on URL
      const matchingNamespace = namespaces.find(namespace => 
        entry.url.includes(namespace['namespace-url'])
      );

      if (matchingNamespace) {
        setSelectedNamespace(matchingNamespace['namespace-id']);

        // Find matching account
        const matchingAccount = matchingNamespace['namespace-accounts'].find(account => 
          entry.url.includes(account['namespace-account-url-override']) ||
          account['namespace-account-header'].some(header => 
            entry.request.headers[header.key] === header.value
          )
        );

        if (matchingAccount) {
          setSelectedAccount(matchingAccount['namespace-account-id']);

          // Find matching method
          const matchingMethod = matchingNamespace['namespace-methods'].find(method => {
            const methodUrl = method['namespace-method-url-override'];
            return methodUrl && entry.url.includes(methodUrl);
          });

          if (matchingMethod) {
            setSelectedMethod(matchingMethod['namespace-method-id']);
          }
        }
      }
    } else {
      // Clear namespace-related fields if original request didn't use namespace
      setSelectedNamespace('');
      setSelectedAccount('');
      setSelectedMethod('');
    }
    
    const params = Object.entries(entry.request.queryParams).map(([key, value]) => ({ key, value }));
    const headerPairs = Object.entries(entry.request.headers).map(([key, value]) => ({ key, value }));
    
    setQueryParams(params.length > 0 ? params : [{ key: '', value: '' }]);
    setHeaders(headerPairs.length > 0 ? headerPairs : [{ key: '', value: '' }]);
    
    if (entry.request.body) {
      setRequestBody(typeof entry.request.body === 'string' ? entry.request.body : JSON.stringify(entry.request.body, null, 2));
      setActiveTab('body');
    } else {
      setRequestBody('');
      setActiveTab('params');
    }
  };

  const handleClearForm = () => {
    setSelectedNamespace('');
    setSelectedAccount('');
    setSelectedMethod('');
    setUrl('');
    setMethodType('GET');
    setQueryParams([{ key: '', value: '' }]);
    setHeaders([{ key: '', value: '' }]);
    setRequestBody('');
    setMaxIterations('');
    setResponse(null);
    setActiveTab('params');
  };

  const handleHeaderKeyChange = (header: KeyValuePair, index: number) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...header, key: header.key };
    setHeaders(newHeaders);
  };

  const handleHeaderValueChange = (header: KeyValuePair, index: number) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...header, value: header.value };
    setHeaders(newHeaders);
  };

  const handleDeleteHeader = (header: KeyValuePair, index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    setHeaders(newHeaders);
  };

  // Helper function to extract items from response
  const extractItemsFromResponse = (responseData: any): ResponseItem[] => {
    const items: ResponseItem[] = [];
    
    // console.log('Raw response data:', JSON.stringify(responseData, null, 2));

    // If it's an error response, don't treat it as an item
    if (responseData?.error || responseData?.message === "Failed to parse response") {
      console.log('Error response detected, skipping item extraction');
      return [];
    }

    // For paginated responses, extract items from the data field
    if (responseData?.data) {
      console.log('Processing paginated response data');
      // Return the data directly instead of recursively calling
      const dataItems = responseData.data;
      if (Array.isArray(dataItems)) {
        return dataItems.map((item: any) => {
          if (item.id) {
            return {
              id: item.id.toString(),
              ...item
            };
          }
          return item;
        });
      }
      // If data is not an array, return it as a single item
      return [dataItems];
    }
    
    if (typeof responseData === 'string') {
      items.push({ value: responseData });
    } else if (typeof responseData !== 'object') {
      items.push({ value: responseData });
    } else if (Array.isArray(responseData)) {
      // Handle array response
      items.push(...responseData.map((item: any) => {
        if (item.id) {
          return {
            id: item.id.toString(),
            ...item
          };
        }
        return item;
      }));
    } else if (responseData?.products) {
      // Handle Shopify products response
      items.push(...responseData.products.map((product: any) => ({
        id: product.id.toString(),
        ...product
      })));
    } else if (responseData?.orders) {
      // Handle Shopify orders response
      items.push(...responseData.orders.map((order: any) => ({
        id: order.id.toString(),
        ...order
      })));
    } else if (responseData?.items) {
      // Handle generic items response
      items.push(...responseData.items.map((item: any) => {
        if (item.id) {
          return {
            id: item.id.toString(),
            ...item
          };
        }
        return item;
      }));
    } else if (responseData?.Item) {
      // Handle single item response with Item wrapper
      const item = responseData.Item;
      if (item.id) {
        items.push({
          id: item.id.toString(),
          ...item
        });
      } else {
        items.push(item);
      }
    } else {
      // Try to find an array property in the response
      const arrayProp = Object.entries(responseData).find(([_, value]) => Array.isArray(value));
      if (arrayProp) {
        items.push(...(arrayProp[1] as any[]).map((item: any) => {
          if (item.id) {
            return {
              id: item.id.toString(),
              ...item
            };
          }
          return item;
        }));
      } else if (responseData) {
        // If no array found and it's not an error, try to use the response data itself
        if (responseData.id) {
          items.push({
            id: responseData.id.toString(),
            ...responseData
          });
        } else {
          items.push(responseData);
        }
      }
    }
    
    console.group('Extracted Items');
    console.log('Number of items extracted:', items.length);
    // console.log('Items:', JSON.stringify(items, null, 2));
    console.groupEnd();
    
    return items;
  };

  // Helper function to save items to DynamoDB
  const saveItemsToDynamoDB = async (
    items: ResponseItem[],
    requestDetails: {
      tableName: string;
      method: string;
      url: string;
      queryParams: Record<string, string>;
      headers: Record<string, string>;
      body?: any;
      status: number;
    }
  ) => {
    const timestamp = new Date().toISOString();
    const baseRequestDetails = {
      method: requestDetails.method,
      url: requestDetails.url,
      queryParams: requestDetails.queryParams,
      headers: requestDetails.headers,
      body: requestDetails.body
    };

    console.group('DynamoDB Save Operation');
    console.log('Saving items to table:', requestDetails.tableName);
    console.log('Number of items to save:', items.length);
    console.groupEnd();

    const BATCH_SIZE = 5;
    const batches = [];
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`);

      const savePromises = batch.map(async (item, index) => {
        const cleanedItem = { ...item };
        
        if (typeof cleanedItem.id === 'number') {
          cleanedItem.id = cleanedItem.id.toString();
        }

        // Remove bookmark and url fields from the item
        const { bookmark, url, ...itemWithoutBookmark } = cleanedItem;

        // Keep only essential fields and primitive values
        const simplifiedItem = Object.entries(itemWithoutBookmark).reduce((acc, [key, value]) => {
          if (typeof value === 'string' || 
              typeof value === 'number' || 
              typeof value === 'boolean' ||
              value === null) {
            acc[key] = value;
          }
          return acc;
        }, {} as any);
        
        const itemData = {
          id: cleanedItem.id || `item_${timestamp}_${batchIndex}_${index}`,
          Item: simplifiedItem,
          timestamp,
          _metadata: {
            requestDetails: baseRequestDetails,
            status: requestDetails.status,
            itemIndex: batchIndex * BATCH_SIZE + index,
            totalItems: items.length,
            originalId: item.id
          }
        };

        console.group('DynamoDB Request Details');
        console.log('Table Name:', requestDetails.tableName);
        console.log('Request URL:', `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dynamodb/tables/${requestDetails.tableName}/items`);
        // console.log('Request Body:', JSON.stringify(itemData, null, 2));
        console.groupEnd();

        try {
          const dbResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dynamodb/tables/${requestDetails.tableName}/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(itemData)
          });

          if (!dbResponse.ok) {
            const errorData = await dbResponse.json();
            console.error('Failed to save item. Response:', {
              status: dbResponse.status,
              statusText: dbResponse.statusText,
              headers: Object.fromEntries(dbResponse.headers.entries()),
              error: errorData
            });
            return null;
          }

          console.log(`Successfully saved item ${batchIndex * BATCH_SIZE + index + 1}/${items.length}`);
          return index;
        } catch (error) {
          console.error(`Error saving item ${batchIndex * BATCH_SIZE + index + 1}:`, error);
          return null;
        }
      });

      await Promise.all(savePromises);
      console.log(`Completed batch ${batchIndex + 1}/${batches.length}`);
    }

    console.log(`Completed saving ${items.length} items to DynamoDB`);
  };

  const handleExpandResponse = () => {
    setIsExpanded(!isExpanded);
  };

  // Add these type definitions near the top of the file
  const filteredAccounts = namespaces.find(n => n['namespace-id'] === selectedNamespace)?.['namespace-accounts']?.filter(account => {
    const searchLower = accountSearchQuery.toLowerCase();
    return (
      account['namespace-account-name'].toLowerCase().includes(searchLower) ||
      account['namespace-account-url-override']?.toLowerCase().includes(searchLower) ||
      account.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }) || [];

  const filteredMethods = namespaces.find(n => n['namespace-id'] === selectedNamespace)?.['namespace-methods']?.filter(method => {
    const searchLower = methodSearchQuery.toLowerCase();
    return (
      method['namespace-method-name'].toLowerCase().includes(searchLower) ||
      method['namespace-method-type'].toLowerCase().includes(searchLower) ||
      method.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }) || [];


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-1 sm:p-3 flex flex-col gap-1 sm:gap-2 overflow-hidden">
          {/* Header */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-2 sm:p-3 flex justify-between items-center shrink-0 border border-gray-100">
            <h1 className="text-sm sm:text-lg font-semibold text-gray-800 flex items-center gap-1.5 sm:gap-2">
              <span className="bg-blue-500 text-white p-1 sm:p-1.5 rounded-lg shadow-sm">
                <Send size={14} className="sm:hidden" />
                <Send size={16} className="hidden sm:block" />
              </span>
              API Client
            </h1>
            <div className="flex items-center gap-1 sm:gap-3">
              <button
                onClick={handleClearForm}
                className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 border border-gray-100"
              >
                <X size={12} className="sm:hidden" />
                <X size={14} className="hidden sm:block" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1 sm:p-2 rounded-lg transition-all duration-200 ${
                  showHistory 
                    ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-100'
                }`}
              >
                <Clock size={14} className="sm:hidden" />
                <Clock size={18} className="hidden sm:block" />
              </button>
            </div>
          </div>

          {/* Namespace, Account, Method Selection Section */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-2 sm:p-6 border border-gray-100">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
              {/* Namespace Selection */}
              <div className="relative group">
                <label className="block text-[10px] sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700 group-hover:text-blue-600 transition-colors duration-200">
                  Namespace
                  <span className="ml-0.5 text-[8px] sm:text-xs text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedNamespace}
                    onChange={handleNamespaceChange}
                    className="w-full p-1.5 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[10px] sm:text-sm shadow-sm appearance-none cursor-pointer hover:bg-gray-100 transition-all duration-200"
                  >
                    <option value="">Select</option>
                    {Array.isArray(namespaces) && namespaces.length > 0 ? (
                      namespaces.map((namespace) => (
                        <option 
                          key={`namespace-${namespace['namespace-id']}`}
                          value={namespace['namespace-id']}
                        >
                          {namespace['namespace-name']}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>None</option>
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-1.5 flex items-center pointer-events-none">
                    <ChevronDown size={12} className="text-gray-400" />
                  </div>
                </div>
                <div className="mt-0.5 sm:mt-1 flex items-center gap-0.5 sm:gap-1">
                  <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-blue-500"></div>
                  <span className="text-[8px] sm:text-xs text-gray-500">
                    {`${namespaces.length} loaded`}
                  </span>
                </div>
              </div>

              {/* Accounts Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">Accounts</h2>
                    <div className="relative flex-1 w-full">
                      <input
                        type="text"
                        placeholder="Search accounts..."
                        value={accountSearchQuery}
                        onChange={(e) => setAccountSearchQuery(e.target.value)}
                        className="w-full px-3 py-1.5 pl-8 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <svg className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-20rem)] sm:max-h-[calc(100vh-24rem)] p-3 sm:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredAccounts.map((account) => (
                      <div key={account['namespace-account-id']} 
                        className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        <div className="p-3 sm:p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {account['namespace-account-name']}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                ID: {account['namespace-account-id'].slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                          
                          {account['namespace-account-url-override'] && (
                            <div className="flex items-center gap-1.5 text-gray-600 mb-2">
                              <Globe size={12} />
                              <p className="text-xs truncate">{account['namespace-account-url-override']}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1 mt-2">
                            {account.tags && account.tags.slice(0, 2).map((tag: string, index: number) => (
                              <span key={index} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full">
                                {tag}
                              </span>
                            ))}
                            {account.tags && account.tags.length > 2 && (
                              <span className="px-1.5 py-0.5 bg-gray-50 text-gray-600 text-[10px] rounded-full">
                                +{account.tags.length - 2}
                              </span>
                            )}
                          </div>

                        
                        </div>
                      </div>
                    ))}
                    {filteredAccounts.length === 0 && (
                      <div className="col-span-full flex items-center justify-center py-8 text-gray-500 text-sm">
                        No accounts found
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Method Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">Methods</h2>
                    <div className="relative flex-1 w-full">
                      <input
                        type="text"
                        placeholder="Search methods..."
                        value={methodSearchQuery}
                        onChange={(e) => setMethodSearchQuery(e.target.value)}
                        className="w-full px-3 py-1.5 pl-8 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <svg className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-20rem)] sm:max-h-[calc(100vh-24rem)] p-3 sm:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredMethods.map((method) => (
                      <div key={method['namespace-method-id']} 
                        className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        <div className="p-3 sm:p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                  {method['namespace-method-name']}
                                </h3>
                                <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                                  method['namespace-method-type'] === 'GET' ? 'bg-green-100 text-green-700' :
                                  method['namespace-method-type'] === 'POST' ? 'bg-blue-100 text-blue-700' :
                                  method['namespace-method-type'] === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                                  method['namespace-method-type'] === 'DELETE' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {method['namespace-method-type']}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                ID: {method['namespace-method-id'].slice(0, 8)}...
                              </p>
                            </div>
                          </div>

                          {method['namespace-method-url-override'] && (
                            <div className="flex items-center gap-1.5 text-gray-600 mb-2">
                              <Globe size={12} />
                              <p className="text-xs truncate">{method['namespace-method-url-override']}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1 mt-2">
                            {method.tags && method.tags.slice(0, 2).map((tag: string, index: number) => (
                              <span key={index} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full">
                                {tag}
                              </span>
                            ))}
                            {method.tags && method.tags.length > 2 && (
                              <span className="px-1.5 py-0.5 bg-gray-50 text-gray-600 text-[10px] rounded-full">
                                +{method.tags.length - 2}
                              </span>
                            )}
                          </div>

                        
                        </div>
                      </div>
                    ))}
                    {filteredMethods.length === 0 && (
                      <div className="col-span-full flex items-center justify-center py-8 text-gray-500 text-sm">
                        No methods found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Method Type and URL Section */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100">
            <div className="p-2 sm:p-4">
              <div className="flex flex-row gap-1.5 sm:gap-4 items-center">
                {/* Method selector with colored badge */}
                <div className="relative w-[60px] sm:w-[140px] shrink-0">
                  <button
                    onClick={() => document.querySelector('select')?.click()}
                    className="w-full h-[30px] sm:h-[38px] bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 relative"
                    type="button"
                  >
                    {/* Method badge */}
                    <span className={`absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${
                      methodType === 'GET' ? 'bg-green-100 text-green-700' :
                      methodType === 'POST' ? 'bg-blue-100 text-blue-700' :
                      methodType === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                      methodType === 'DELETE' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {methodType}
                    </span>

                    {/* Dropdown arrow */}
                    <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 text-gray-500">
                      <ChevronDown size={10} className="sm:hidden" />
                      <ChevronDown size={14} className="hidden sm:block" />
                    </div>
                  </button>

                  <select
                    value={methodType}
                    onChange={handleMethodTypeChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>

                {/* URL Input */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full p-1.5 sm:p-2.5 text-[10px] sm:text-sm bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter URL"
                  />
                </div>

                {/* Max Iterations and Action Buttons */}
                <div className="flex gap-1.5 sm:gap-2">
                  <input
                    type="number"
                    value={maxIterations}
                    onChange={(e) => setMaxIterations(e.target.value)}
                    className="w-12 sm:w-24 p-1.5 sm:p-2.5 text-[10px] sm:text-sm bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Max"
                    aria-label="Max iterations"
                  />
                  
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => handleExecute(false)}
                      disabled={isLoading}
                      className={`p-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs rounded-lg transition-all duration-200 flex items-center gap-1 sm:gap-1.5 shadow-sm ${
                        isLoading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                      }`}
                    >
                      <Send size={12} />
                    </button>
                    <button
                      onClick={() => handleExecute(true)}
                      disabled={isLoading}
                      className={`p-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs rounded-lg transition-all duration-200 flex items-center gap-1 sm:gap-1.5 shadow-sm ${
                        isLoading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                      }`}
                    >
                      <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100">
              <div className="flex overflow-x-auto border-b border-gray-100">
                <button
                  onClick={() => setActiveTab('params')}
                  className={`px-3 sm:px-4 py-2 font-medium text-[10px] sm:text-sm whitespace-nowrap ${
                    activeTab === 'params'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Parameters
                </button>
                <button
                  onClick={() => setActiveTab('headers')}
                  className={`px-3 sm:px-4 py-2 font-medium text-[10px] sm:text-sm whitespace-nowrap ${
                    activeTab === 'headers'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Headers
                </button>
                <button
                  onClick={() => setActiveTab('body')}
                  className={`px-3 sm:px-4 py-2 font-medium text-[10px] sm:text-sm whitespace-nowrap ${
                    activeTab === 'body'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Body
                </button>
              </div>

              <div className="p-2 sm:p-4">
                {activeTab === 'params' && (
                  <div className="space-y-2">
                    {queryParams.map((param, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2 bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100">
                        <input
                          type="text"
                          value={param.key}
                          onChange={(e) => handleKeyValueChange(index, 'key', e.target.value, 'queryParams')}
                          className="flex-1 p-2 sm:p-2.5 text-xs sm:text-sm border border-gray-200 rounded-lg shadow-sm"
                          placeholder="Key"
                        />
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleKeyValueChange(index, 'value', e.target.value, 'queryParams')}
                          className="flex-1 p-2 sm:p-2.5 text-xs sm:text-sm border border-gray-200 rounded-lg shadow-sm"
                          placeholder="Value"
                        />
                        <button
                          onClick={() => handleRemoveKeyValuePair(index, 'queryParams')}
                          className="p-1 sm:p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors duration-200"
                        >
                          <Trash2 size={12} className="sm:hidden" />
                          <Trash2 size={14} className="hidden sm:block" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddKeyValuePair('queryParams')}
                      className="mt-2 flex items-center gap-1 text-[10px] sm:text-sm text-blue-600 hover:text-blue-700 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <span className="text-base sm:text-lg font-semibold">+</span> Add Parameter
                    </button>
                  </div>
                )}

                {activeTab === 'headers' && (
                  <div className="space-y-2">
                    {headers.map((header, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2 bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100">
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => handleHeaderKeyChange(header, index)}
                          className="flex-1 p-2 sm:p-2.5 text-xs sm:text-sm border border-gray-200 rounded-lg shadow-sm"
                          placeholder="Key"
                        />
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => handleHeaderValueChange(header, index)}
                          className="flex-1 p-2 sm:p-2.5 text-xs sm:text-sm border border-gray-200 rounded-lg shadow-sm"
                          placeholder="Value"
                        />
                        <button
                          onClick={() => handleDeleteHeader(header, index)}
                          className="p-1 sm:p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors duration-200"
                        >
                          <Trash2 size={12} className="sm:hidden" />
                          <Trash2 size={14} className="hidden sm:block" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddKeyValuePair('headers')}
                      className="mt-2 flex items-center gap-1 text-[10px] sm:text-sm text-blue-600 hover:text-blue-700 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <span className="text-base sm:text-lg font-semibold">+</span> Add Header
                    </button>
                  </div>
                )}

                {activeTab === 'body' && (
                  <div>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      className="w-full h-28 sm:h-36 p-2 sm:p-3 font-mono text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter request body (JSON)"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full overflow-hidden">
            {response && (
              <div className="space-y-4 h-full overflow-auto">
                <div className="bg-white rounded-xl shadow-md h-full flex flex-col overflow-hidden border border-gray-100">
                  <div className="flex justify-between items-center border-b border-gray-100 shrink-0 overflow-x-auto">
                    <div className="flex overflow-x-auto">
                      <button
                        onClick={() => setResponseTab('body')}
                        className={`px-4 py-2.5 font-medium text-xs sm:text-sm whitespace-nowrap ${
                          responseTab === 'body'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Body
                      </button>
                      <button
                        onClick={() => setResponseTab('headers')}
                        className={`px-4 py-2.5 font-medium text-xs sm:text-sm whitespace-nowrap ${
                          responseTab === 'headers'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Headers
                      </button>
                      <button
                        onClick={() => setResponseTab('schema')}
                        className={`px-4 py-2.5 font-medium text-xs sm:text-sm whitespace-nowrap ${
                          responseTab === 'schema'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Schema
                      </button>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4">
                      <div className={`px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium ${
                        response.status >= 200 && response.status < 300
                          ? 'bg-green-100 text-green-800'
                          : response.status >= 400
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {response.status}
                      </div>
                      <button
                        onClick={handleCopyResponse}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title={`Copy ${responseTab}`}
                      >
                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                      <button
                        onClick={handleDownloadResponse}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title={`Download ${responseTab}`}
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-hidden">
                    {responseTab === 'body' ? (
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg h-full overflow-auto border border-gray-100">
                        <div className="font-mono text-xs sm:text-sm break-all whitespace-pre-wrap max-w-full">
                          <JSONTree data={response.body} />
                        </div>
                      </div>
                    ) : responseTab === 'headers' ? (
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg h-full overflow-auto border border-gray-100">
                        <div className="space-y-2.5 font-mono text-xs sm:text-sm">
                          {Object.entries(response.rawHeaders || {}).map(([key, value]) => (
                            <div key={key} className="flex flex-col sm:flex-row p-2 border-b border-gray-100">
                              <span className="text-blue-600 font-semibold sm:min-w-[200px] break-all">{key}:</span>
                              <span className="text-gray-700 break-all">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg h-full overflow-auto border border-gray-100">
                        <div className="font-mono text-xs sm:text-sm break-all whitespace-pre-wrap max-w-full">
                          <JSONTree data={generateResponseSchema(response.body)} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div 
        className={`bg-white w-full sm:w-80 md:w-96 border-l border-gray-200 transition-all duration-300 transform ${
          showHistory ? 'translate-x-0' : 'translate-x-full'
        } fixed right-0 top-0 h-full z-50 shadow-2xl`}
      >
        <div className="h-full flex flex-col">
          <div className="p-3 sm:p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                title="Collapse History"
              >
                <ChevronRight size={18} className="text-gray-500" />
              </button>
              <h2 className="text-base sm:text-lg font-medium text-gray-800">Request History</h2>
            </div>
            <button
              onClick={handleClearHistory}
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 mt-4 text-sm space-y-2">
                <Clock size={48} className="text-gray-300" />
                <p>No request history available</p>
                <p className="text-xs text-gray-400">Previous requests will appear here</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => loadHistoryEntry(entry)}
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 hover:shadow-sm relative group border border-gray-100 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        entry.response.status >= 200 && entry.response.status < 300
                          ? 'bg-green-100 text-green-800'
                          : entry.response.status >= 400
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {entry.response.status}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                      <span className={`text-xs sm:text-sm font-medium px-2 py-0.5 rounded ${
                        entry.method === 'GET' ? 'bg-green-50 text-green-700' :
                        entry.method === 'POST' ? 'bg-blue-50 text-blue-700' :
                        entry.method === 'PUT' ? 'bg-yellow-50 text-yellow-700' :
                        entry.method === 'DELETE' ? 'bg-red-50 text-red-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>
                        {entry.method}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600 truncate flex-1">
                        {entry.url}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistoryEntry(entry.id, e)}
                      className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiService;