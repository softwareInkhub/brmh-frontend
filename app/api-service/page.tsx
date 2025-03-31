'use client';

import React, { useState, useEffect } from 'react';
import { Send, RefreshCw, Copy, Download, Check, Clock, X, Trash2, ChevronRight, ChevronDown } from 'react-feather';
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

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-2 flex flex-col gap-2 overflow-hidden">
          <div className="bg-white rounded-lg shadow p-2 flex justify-between items-center shrink-0">
            <h1 className="text-lg font-medium text-gray-800">API Client</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearForm}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                title="Clear all fields"
              >
                <X size={14} />
                Clear All
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded transition-all duration-200 ${
                  showHistory 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title="View History"
              >
                <Clock size={20} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Namespace <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  value={selectedNamespace}
                  onChange={handleNamespaceChange}
                  className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option key="namespace-default" value="">Select Namespace</option>
                  {Array.isArray(namespaces) && namespaces.length > 0 ? (
                    namespaces.map((namespace, index) => (
                      <option 
                        key={`namespace-${namespace['namespace-id']}`}
                        value={namespace['namespace-id']}
                      >
                        {namespace['namespace-name']}
                      </option>
                    ))
                  ) : (
                    <option key="no-namespaces" value="" disabled>
                      No namespaces available
                    </option>
                  )}
                </select>
                {/* Debug info */}
                <div className="text-xs text-gray-500 mt-1">
                  {`${namespaces.length} namespace(s) loaded`}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  value={selectedAccount}
                  onChange={handleAccountChange}
                  className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedNamespace}
                >
                  <option key="account-default" value="">Select Account</option>
                  {namespaces
                    .find(n => n['namespace-id'] === selectedNamespace)
                    ?.['namespace-accounts']
                    ?.map((account, index) => (
                      <option 
                        key={account['namespace-account-id'] ? `account-${account['namespace-account-id']}` : `account-index-${index}`} 
                        value={account['namespace-account-id'] || ''}
                      >
                        {account['namespace-account-name'] || 'Unnamed Account'}
                      </option>
                    )) || []}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Method <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  value={selectedMethod}
                  onChange={handleMethodChange}
                  className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedNamespace}
                >
                  <option key="method-default" value="">Select Method</option>
                  {namespaces
                    .find(n => n['namespace-id'] === selectedNamespace)
                    ?.['namespace-methods']
                    ?.map((method, index) => {
                      // console.log('Method in dropdown:', method); // Debug log
                      return (
                        <option 
                          key={method['namespace-method-id'] || `method-index-${index}`}
                          value={method['namespace-method-id'] || ''}
                        >
                          {method['namespace-method-name'] || 'Unnamed Method'}
                        </option>
                      );
                    }) || []}
                </select>
                {/* Debug info */}
                <div className="text-xs text-gray-500 mt-1">
                  {`${namespaces.find(n => n['namespace-id'] === selectedNamespace)?.['namespace-methods']?.length || 0} method(s) loaded`}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4">
              <div className="flex gap-4 items-center">
                <select
                  value={methodType}
                  onChange={handleMethodTypeChange}
                  className="p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option key="method-get" value="GET">GET</option>
                  <option key="method-post" value="POST">POST</option>
                  <option key="method-put" value="PUT">PUT</option>
                  <option key="method-delete" value="DELETE">DELETE</option>
                  <option key="method-patch" value="PATCH">PATCH</option>
                </select>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter URL"
                />
                <input
                  type="number"
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(e.target.value)}
                  className="w-32 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Max iterations"
                  aria-label="Max iterations"
                />
                <button
                  onClick={() => handleExecute(false)}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded transition-all duration-200 flex items-center gap-2 ${
                    isLoading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Send size={16} /> Send
                </button>
                <button
                  onClick={() => handleExecute(true)}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded transition-all duration-200 flex items-center gap-2 ${
                    isLoading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Send Loop
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('params')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'params'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Params
                </button>
                <button
                  onClick={() => setActiveTab('headers')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'headers'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Headers
                </button>
                <button
                  onClick={() => setActiveTab('body')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'body'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Body
                </button>
              </div>

              <div className="p-4">
                {activeTab === 'params' && (
                  <div className="space-y-2">
                    {queryParams.map((param, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={param.key}
                          onChange={(e) => handleKeyValueChange(index, 'key', e.target.value, 'queryParams')}
                          className="flex-1 p-2 border border-gray-200 rounded"
                          placeholder="Key"
                        />
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleKeyValueChange(index, 'value', e.target.value, 'queryParams')}
                          className="flex-1 p-2 border border-gray-200 rounded"
                          placeholder="Value"
                        />
                        <button
                          onClick={() => handleRemoveKeyValuePair(index, 'queryParams')}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddKeyValuePair('queryParams')}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Parameter
                    </button>
                  </div>
                )}

                {activeTab === 'headers' && (
                  <div className="space-y-2">
                    {headers.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => handleHeaderKeyChange(header, index)}
                          className="flex-1 p-2 border border-gray-200 rounded"
                          placeholder="Key"
                        />
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => handleHeaderValueChange(header, index)}
                          className="flex-1 p-2 border border-gray-200 rounded"
                          placeholder="Value"
                        />
                        <button
                          onClick={() => handleDeleteHeader(header, index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddKeyValuePair('headers')}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Header
                    </button>
                  </div>
                )}

                {activeTab === 'body' && (
                  <div>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      className="w-full h-48 p-2 font-mono text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter request body (JSON)"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          

          <div className="flex-1 min-h-0 w-[82VW] overflow-scroll">
            {response && (
              <div className="space-y-4 overflow-auto">
                <div className="bg-white rounded-lg shadow h-full flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center border-b border-gray-200 shrink-0 overflow-auto">
                    <div className="flex overflow-auto">
                      <button
                        onClick={() => setResponseTab('body')}
                        className={`px-4 py-2 font-medium text-sm ${
                          responseTab === 'body'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Response Body
                      </button>
                      <button
                        onClick={() => setResponseTab('headers')}
                        className={`px-4 py-2 font-medium text-sm ${
                          responseTab === 'headers'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Response Headers
                      </button>
                      <button
                        onClick={() => setResponseTab('schema')}
                        className={`px-4 py-2 font-medium text-sm ${
                          responseTab === 'schema'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Response Schema
                      </button>
                    </div>
                    <div className="flex items-center gap-4 px-4">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        response.status >= 200 && response.status < 300
                          ? 'bg-green-100 text-green-800'
                          : response.status >= 400 && response.status < 500
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        Status: {response.status}
                      </div>
                      <button
                        onClick={handleCopyResponse}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
                        title={`Copy ${responseTab}`}
                      >
                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                      <button
                        onClick={handleDownloadResponse}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
                        title={`Download ${responseTab}`}
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 p-4 overflow-hidden">
                    {responseTab === 'body' ? (
                      <div className="bg-gray-50 p-4 rounded h-full overflow-auto font-mono text-sm">
                        <JSONTree data={response.body} />
                      </div>
                    ) : responseTab === 'headers' ? (
                      <div className="bg-gray-50 p-4 rounded h-full overflow-auto font-mono text-sm">
                        <div className="space-y-2">
                          {Object.entries(response.rawHeaders || {}).map(([key, value]) => (
                            <div key={key} className="flex">
                              <span className="text-blue-600 font-semibold min-w-[200px]">{key}:</span>
                              <span className="text-gray-700 break-all">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded h-full overflow-auto font-mono text-sm">
                        <JSONTree data={generateResponseSchema(response.body)} />
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
        className={`bg-white w-96 border-l border-gray-200 transition-all duration-300 transform ${
          showHistory ? 'translate-x-0' : 'translate-x-full'
        } fixed right-0 top-0 h-full z-50 shadow-2xl`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
                title="Collapse History"
              >
                <ChevronRight size={20} className="text-gray-500" />
              </button>
              <h2 className="text-lg font-medium text-gray-800">Request History</h2>
            </div>
            <button
              onClick={handleClearHistory}
              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 size={14} />
              Clear History
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {history.length === 0 ? (
              <div className="text-center text-gray-500 mt-4">
                No request history available
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => loadHistoryEntry(entry)}
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 relative group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        entry.response.status >= 200 && entry.response.status < 300
                          ? 'bg-green-100 text-green-800'
                          : entry.response.status >= 400
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        Status: {entry.response.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-blue-600">
                        {entry.method}
                      </span>
                      <span className="text-sm text-gray-600 truncate flex-1">
                        {entry.url}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistoryEntry(entry.id, e)}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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