'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Database, Globe, Users, Code, Plus, Edit2, Trash2, CheckCircle, Download } from 'react-feather';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface KeyValuePair {
  key: string;
  value: string;
}

interface Method {
  'namespace-id': string;
  'namespace-method-id': string;
  'namespace-method-name': string;
  'namespace-method-type': string;
  'namespace-method-url-override': string;
  'namespace-method-queryParams': KeyValuePair[];
  'namespace-method-header': KeyValuePair[];
  'save-data': boolean;
  'isInitialized': boolean;
  'tags': string[];
  'sample-request'?: Record<string, any>;
  'sample-response'?: Record<string, any>;
  'request-schema'?: Record<string, any>;
  'response-schema'?: Record<string, any>;
}

interface Namespace {
  'namespace-id': string;
  'namespace-name': string;
  'namespace-url': string;
  'tags': string[];
  'namespace-methods': Method[];
  'namespace-accounts': any[];
}

interface PageParams {
  id: string;
}

interface NewAccount {
  'namespace-account-name': string;
  'namespace-account-url-override'?: string;
  'namespace-account-header': KeyValuePair[];
  'variables': KeyValuePair[];
  'tags': string[];
}

interface NewMethod {
  'namespace-method-name': string;
  'namespace-method-type': string;
  'namespace-method-url-override'?: string;
  'namespace-method-queryParams': KeyValuePair[];
  'namespace-method-header': KeyValuePair[];
  'save-data': boolean;
  'tags': string[];
}

const NamespaceDetailPage = ({ params }: { params: Promise<PageParams> }) => {
  const resolvedParams = React.use(params);
  const [namespace, setNamespace] = useState<Namespace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [newAccount, setNewAccount] = useState<NewAccount>({
    'namespace-account-name': '',
    'namespace-account-url-override': '',
    'namespace-account-header': [],
    'variables': [],
    'tags': []
  });
  const [newMethod, setNewMethod] = useState<NewMethod>({
    'namespace-method-name': '',
    'namespace-method-type': 'GET',
    'namespace-method-url-override': '',
    'namespace-method-queryParams': [],
    'namespace-method-header': [],
    'save-data': false,
    'tags': []
  });
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editingMethod, setEditingMethod] = useState<Method | null>(null);

  const fetchAccounts = async (namespaceId: string) => {
    try {
      const accountsUrl = `${API_BASE_URL}/namespaces/${namespaceId}/accounts`;
      console.log('Fetching accounts from:', accountsUrl);
      
      const response = await fetch(accountsUrl);
      console.log('Accounts Response Status:', response.status);
      console.log('Accounts Response URL:', response.url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      console.log('Accounts Response Data:', JSON.stringify(data, null, 2));
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchMethods = async (namespaceId: string) => {
    try {
      const methodsUrl = `${API_BASE_URL}/namespaces/${namespaceId}/methods`;
      console.log('Fetching methods from:', methodsUrl);
      
      const response = await fetch(methodsUrl);
      console.log('Methods Response Status:', response.status);
      console.log('Methods Response URL:', response.url);

      if (!response.ok) {
        throw new Error('Failed to fetch methods');
      }
      const data = await response.json();
      console.log('Methods Response Data:', JSON.stringify(data, null, 2));
      setMethods(data || []);
    } catch (error) {
      console.error('Error fetching methods:', error);
    }
  };

  const fetchNamespaceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching namespace details for ID:', resolvedParams.id);
      
      const response = await fetch(`${API_BASE_URL}/namespaces/${resolvedParams.id}`);
      console.log('Namespace details response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch namespace details: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw namespace details response:', data);

      // Transform the DynamoDB format
      const transformedData = {
        'namespace-id': data['namespace-id'] || '',
        'namespace-name': data['namespace-name'] || '',
        'namespace-url': data['namespace-url'] || '',
        'tags': Array.isArray(data.tags) ? data.tags : [],
        'namespace-methods': [],
        'namespace-accounts': []
      };

      console.log('Transformed namespace data:', transformedData);
      setNamespace(transformedData);

      // Fetch accounts and methods
      console.log('Fetching accounts and methods...');
      await Promise.all([
        fetchAccounts(transformedData['namespace-id']),
        fetchMethods(transformedData['namespace-id'])
      ]);
      console.log('Finished fetching accounts and methods');
      
    } catch (error) {
      console.error('Error in fetchNamespaceDetails:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      setError(error instanceof Error ? error.message : 'Failed to fetch namespace details');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthRedirect = useCallback((account: any) => {
    console.log("inside handleOAuthRedirect");
    
    const variables = account['variables'] || [];
    const clientId = variables.find((v: any) => v.key === 'client_id')?.value;
    const clientSecret = variables.find((v: any) => v.key === 'secret_key')?.value;
    const redirectUrl = variables.find((v: any) => v.key === 'redirect_uri')?.value;

    if (!clientId || !redirectUrl || !clientSecret) {
      alert('Missing client_id, secret_key, or redirect_uri in account variables');
      return;
    }

    const scopes = ['boards:read', 'boards:write', 'pins:read', 'pins:write'];
    const authUrl = new URL('https://www.pinterest.com/oauth/');
    
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUrl);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(','));

    // Store account details in sessionStorage for retrieval after redirect
    sessionStorage.setItem('pinterestAccountDetails', JSON.stringify({
      clientId,
      clientSecret,
      redirectUrl,
      accountId: account['namespace-account-id']
    }));

    // Redirect to Pinterest OAuth
    window.location.href = authUrl.toString();
  }, []);

  // Add useEffect for handling OAuth code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      const storedDetails = sessionStorage.getItem('pinterestAccountDetails');
      if (storedDetails) {
        const accountDetails = JSON.parse(storedDetails);
        fetchPinterestToken(code, accountDetails);
        // Clear stored details
        sessionStorage.removeItem('pinterestAccountDetails');
      }
    }
  }, []);

  const fetchPinterestToken = async (code: string, accountDetails: any) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_AWS_URL}/api/pinterest/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          clientId: accountDetails.clientId,
          clientSecret: accountDetails.clientSecret,
          redirectUrl: accountDetails.redirectUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch token');
      }

      const token = await response.json();
      console.log('Pinterest OAuth Token:', token);
      
      // Fetch current accounts and get the data directly
      const accountsResponse = await fetch(`${API_BASE_URL}/namespaces/${resolvedParams.id}/accounts`);
      if (!accountsResponse.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const accountsData = await accountsResponse.json();
      const currentAccount = accountsData.find((a: any) => a['namespace-account-id'] === accountDetails.accountId);
      
      if (currentAccount) {
        // Create updated account data with the new token
        const updatedAccount = {
          ...currentAccount,
          'namespace-account-header': [
            ...(currentAccount['namespace-account-header'] || []).filter((h: KeyValuePair) => h.key !== 'token'),
            { key: 'Authorization', value: `Bearer ${token}` }
          ]
        };

        // Update the account on the backend
        const updateResponse = await fetch(`${API_BASE_URL}/accounts/${accountDetails.accountId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedAccount)
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update account with token');
        }

        // Update local state with the new accounts data
        setAccounts(accountsData.map((acc: any) => 
          acc['namespace-account-id'] === accountDetails.accountId ? updatedAccount : acc
        ));

        // Remove code from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        window.history.replaceState({}, '', url.toString());

        alert('Pinterest token saved successfully!');
      } else {
        throw new Error('Account not found');
      }
    } catch (error) {
      console.error('Error fetching Pinterest token:', error);
      alert('Failed to fetch Pinterest token. Please try again.');
    }
  };

  const handleCreateAccount = async () => {
    try {
      let url;
      let method;
      
      if (editingAccount) {
        url = `${API_BASE_URL}/accounts/${editingAccount['namespace-account-id']}`;
        method = 'PUT';
      } else {
        url = `${API_BASE_URL}/namespaces/${resolvedParams.id}/accounts`;
        method = 'POST';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAccount),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingAccount ? 'update' : 'create'} account`);
      }

      const data = await response.json();
      if (editingAccount) {
        setAccounts(accounts.map(acc => 
          acc['namespace-account-id'] === editingAccount['namespace-account-id'] ? data : acc
        ));
      } else {
        setAccounts([...accounts, data]);
      }
      setIsAddingAccount(false);
      setEditingAccount(null);
      setNewAccount({
        'namespace-account-name': '',
        'namespace-account-url-override': '',
        'namespace-account-header': [],
        'variables': [],
        'tags': []
      });
    } catch (error) {
      console.error('Error saving account:', error);
      alert(`Failed to ${editingAccount ? 'update' : 'create'} account`);
    }
  };

  const handleCreateMethod = async () => {
    try {
      let url;
      let method;
      
      if (editingMethod) {
        url = `${API_BASE_URL}/methods/${editingMethod['namespace-method-id']}`;
        method = 'PUT';
      } else {
        url = `${API_BASE_URL}/namespaces/${resolvedParams.id}/methods`;
        method = 'POST';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMethod),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingMethod ? 'update' : 'create'} method`);
      }

      const data = await response.json();
      if (editingMethod) {
        setMethods(methods.map(m => 
          m['namespace-method-id'] === editingMethod['namespace-method-id'] ? data : m
        ));
      } else {
        setMethods([...methods, data]);
      }
      setIsAddingMethod(false);
      setEditingMethod(null);
      setNewMethod({
        'namespace-method-name': '',
        'namespace-method-type': 'GET',
        'namespace-method-url-override': '',
        'namespace-method-queryParams': [],
        'namespace-method-header': [],
        'save-data': false,
        'tags': []
      });
    } catch (error) {
      console.error('Error saving method:', error);
      alert(`Failed to ${editingMethod ? 'update' : 'create'} method`);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/accounts/${accountId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete account');
        }

        setAccounts(accounts.filter(account => account['namespace-account-id'] !== accountId));
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account');
      }
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    if (window.confirm('Are you sure you want to delete this method?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/methods/${methodId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete method');
        }

        setMethods(methods.filter(method => method['namespace-method-id'] !== methodId));
      } catch (error) {
        console.error('Error deleting method:', error);
        alert('Failed to delete method');
      }
    }
  };

  const handleEditAccount = (account: any) => {
    setEditingAccount(account);
    setNewAccount({
      'namespace-account-name': account['namespace-account-name'],
      'namespace-account-url-override': account['namespace-account-url-override'] || '',
      'namespace-account-header': account['namespace-account-header'] || [],
      'variables': account['variables'] || [],
      'tags': account.tags || []
    });
    setIsAddingAccount(true);
  };

  const handleEditMethod = (method: Method) => {
    setEditingMethod(method);
    setNewMethod({
      'namespace-method-name': method['namespace-method-name'],
      'namespace-method-type': method['namespace-method-type'],
      'namespace-method-url-override': method['namespace-method-url-override'] || '',
      'namespace-method-queryParams': method['namespace-method-queryParams'] || [],
      'namespace-method-header': method['namespace-method-header'] || [],
      'save-data': method['save-data'],
      'tags': method.tags || []
    });
    setIsAddingMethod(true);
  };

  /**
   * Handles table initialization for a method
   */
  const handleInitializeTable = async (method: Method, namespace: Namespace) => {
    try {
      // Skip if already initialized
      if (method.isInitialized) {
        return;
      }

      // Create table name from combination of namespace and method names
      const tableName = `${namespace['namespace-name']}_${method['namespace-method-name']}`.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

      console.log('Creating table:', tableName);

      // Create table in DynamoDB
      const response = await fetch(`${API_BASE_URL}/api/dynamodb/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          TableName: tableName,
          KeySchema: [
            {
              AttributeName: "id",
              KeyType: "HASH"
            }
          ],
          AttributeDefinitions: [
            {
              AttributeName: "id",
              AttributeType: "S"
            }
          ],
          BillingMode: "PAY_PER_REQUEST"
        }),
      });

      console.log('Table creation response:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Table creation error:', errorData);
        throw new Error(errorData?.message || errorData?.error || 'Failed to initialize table');
      }

      const responseData = await response.json();
      console.log('Table creation successful:', responseData);

      // Keep only the fields that are required and match the exact structure
      const methodUpdatePayload = {
        'namespace-id': method['namespace-id'],
        'namespace-method-name': method['namespace-method-name'],
        'namespace-method-type': method['namespace-method-type'],
        'namespace-method-url-override': method['namespace-method-url-override'] || '',
        'namespace-method-queryParams': method['namespace-method-queryParams'] || [],
        'namespace-method-header': method['namespace-method-header'] || [],
        'save-data': method['save-data'],
        'isInitialized': true,
        'tags': method['tags'] || []
      };

      console.log('Updating method with payload:', methodUpdatePayload);

      // Update method's isInitialized status
      const updateResponse = await fetch(`${API_BASE_URL}/methods/${method['namespace-method-id']}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(methodUpdatePayload),
      });

      if (!updateResponse.ok) {
        const updateErrorData = await updateResponse.json().catch(() => null);
        console.error('Method update error:', updateErrorData);
        throw new Error(updateErrorData?.message || updateErrorData?.error || 'Failed to update method status');
      }

      // Update local state
      const updatedMethod = await updateResponse.json();
      setMethods(methods.map(m => 
        m['namespace-method-id'] === method['namespace-method-id'] ? updatedMethod : m
      ));

      alert('Table initialized successfully!');

    } catch (error) {
      console.error('Error initializing table:', error);
      alert('Failed to initialize table: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  useEffect(() => {
    fetchNamespaceDetails();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Database className="text-gray-400 animate-pulse" size={24} />
          <p className="text-gray-600">Loading namespace details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">
          <p>Error: {error}</p>
          <button 
            onClick={fetchNamespaceDetails}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!namespace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">No namespace found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Database className="text-blue-600" size={24} />
                    <h1 className="text-2xl font-bold text-gray-900">{namespace['namespace-name']}</h1>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <Globe size={16} />
                    <p className="text-sm">{namespace['namespace-url']}</p>
                  </div>
                  {namespace.tags && namespace.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {namespace.tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

              {/* Accounts Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Users className="text-blue-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Accounts</h2>
            </div>
            <button
              onClick={() => setIsAddingAccount(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              <Plus size={16} />
              Create Account
            </button>
          </div>
          {accounts.length > 0 ? (
            <div className="grid gap-4">
              {accounts.map((account, index) => (
                <div key={index} className="p-4 border border-gray-100 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-gray-900 mb-1">{account['namespace-account-name']}</p>
                      <p className="text-sm text-gray-600 mb-2">ID: {account['namespace-account-id']}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOAuthRedirect(account)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-1"
                        title="Fetch Token"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="Edit Account"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account['namespace-account-id'])}
                        className="p-1.5 text-gray-600 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete Account"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {account['namespace-account-url-override'] && (
                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                      <Globe size={14} />
                      <p className="text-sm">{account['namespace-account-url-override']}</p>
                    </div>
                  )}

                  {account['namespace-account-header'] && account['namespace-account-header'].length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Headers:</p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        {account['namespace-account-header'].map((header: { key: string; value: string }, headerIndex: number) => (
                          <div key={headerIndex} className="flex gap-2 text-sm">
                            <span className="text-gray-600">{header.key}:</span>
                            <span className="text-gray-900">{header.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {account['variables'] && account['variables'].length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Variables:</p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        {account['variables'].map((variable: { key: string; value: string }, variableIndex: number) => (
                          <div key={variableIndex} className="flex gap-2 text-sm">
                            <span className="text-gray-600">{variable.key}:</span>
                            <span className="text-gray-900">{variable.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No accounts found</p>
        )}
      </div>

        {/* Methods Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Code className="text-blue-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Methods</h2>
            </div>
            <button
              onClick={() => setIsAddingMethod(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              <Plus size={16} />
              Create Method
            </button>
          </div>
          {methods.length > 0 ? (
            <div className="grid gap-4">
              {methods.map((method, index) => (
                <div key={method['namespace-method-id']} className="p-4 border border-gray-100 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-gray-900">{method['namespace-method-name']}</p>
                        <span className={`px-2 py-1 text-xs rounded ${
                          method['namespace-method-type'] === 'GET' ? 'bg-green-100 text-green-700' :
                          method['namespace-method-type'] === 'POST' ? 'bg-blue-100 text-blue-700' :
                          method['namespace-method-type'] === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                          method['namespace-method-type'] === 'DELETE' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {method['namespace-method-type']}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">ID: {method['namespace-method-id']}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditMethod(method)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="Edit Method"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteMethod(method['namespace-method-id'])}
                        className="p-1.5 text-gray-600 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete Method"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {method['namespace-method-url-override'] && (
                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                      <Globe size={14} />
                      <p className="text-sm">{method['namespace-method-url-override']}</p>
                    </div>
                  )}

                  {method['namespace-method-queryParams'] && method['namespace-method-queryParams'].length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Query Parameters:</p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        {method['namespace-method-queryParams'].map((param, paramIndex) => (
                          <div key={paramIndex} className="flex gap-2 text-sm">
                            <span className="text-gray-600">{param.key}:</span>
                            <span className="text-gray-900">{param.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {method['namespace-method-header'] && method['namespace-method-header'].length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Headers:</p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        {method['namespace-method-header'].map((header, headerIndex) => (
                          <div key={headerIndex} className="flex gap-2 text-sm">
                            <span className="text-gray-600">{header.key}:</span>
                            <span className="text-gray-900">{header.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="mt-3 flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Save Data:</span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        method['save-data'] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {method['save-data'] ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {method['isInitialized'] ? (
                        <>
                          <span className="text-sm text-gray-600">Status:</span>
                          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle size={12} />
                            Initialized
                          </span>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInitializeTable(method, namespace!);
                          }}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <Database size={12} />
                          Initialize Table
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Schema Information */}
                  {(method['sample-request'] || method['sample-response'] || 
                    method['request-schema'] || method['response-schema']) && (
                    <div className="mt-4 grid gap-3">
                      {method['sample-request'] && Object.keys(method['sample-request']).length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Sample Request:</p>
                          <pre className="bg-gray-50 rounded-lg p-3 text-sm overflow-x-auto">
                            {JSON.stringify(method['sample-request'], null, 2)}
                          </pre>
                        </div>
                      )}
                      {method['sample-response'] && Object.keys(method['sample-response']).length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Sample Response:</p>
                          <pre className="bg-gray-50 rounded-lg p-3 text-sm overflow-x-auto">
                            {JSON.stringify(method['sample-response'], null, 2)}
                          </pre>
                        </div>
                      )}
                      {method['request-schema'] && Object.keys(method['request-schema']).length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Request Schema:</p>
                          <pre className="bg-gray-50 rounded-lg p-3 text-sm overflow-x-auto">
                            {JSON.stringify(method['request-schema'], null, 2)}
                          </pre>
                        </div>
                      )}
                      {method['response-schema'] && Object.keys(method['response-schema']).length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Response Schema:</p>
                          <pre className="bg-gray-50 rounded-lg p-3 text-sm overflow-x-auto">
                            {JSON.stringify(method['response-schema'], null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No methods found</p>
          )}
        </div>

        {/* Create Account Modal */}
        {isAddingAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">
                {editingAccount ? 'Edit Account' : 'Create New Account'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={newAccount['namespace-account-name']}
                    onChange={(e) => setNewAccount({
                      ...newAccount,
                      'namespace-account-name': e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL Override
                  </label>
                  <input
                    type="text"
                    value={newAccount['namespace-account-url-override']}
                    onChange={(e) => setNewAccount({
                      ...newAccount,
                      'namespace-account-url-override': e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Headers
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewAccount({
                        ...newAccount,
                        'namespace-account-header': [...newAccount['namespace-account-header'], { key: '', value: '' }]
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Header
                    </button>
                  </div>
                  <div className="space-y-2">
                    {newAccount['namespace-account-header'].map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => {
                            const updatedHeaders = [...newAccount['namespace-account-header']];
                            updatedHeaders[index] = { ...header, key: e.target.value };
                            setNewAccount({
                              ...newAccount,
                              'namespace-account-header': updatedHeaders
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => {
                            const updatedHeaders = [...newAccount['namespace-account-header']];
                            updatedHeaders[index] = { ...header, value: e.target.value };
                            setNewAccount({
                              ...newAccount,
                              'namespace-account-header': updatedHeaders
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHeaders = newAccount['namespace-account-header'].filter((_, i) => i !== index);
                            setNewAccount({
                              ...newAccount,
                              'namespace-account-header': updatedHeaders
                            });
                          }}
                          className="px-2 py-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Variables
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewAccount({
                        ...newAccount,
                        'variables': [...newAccount['variables'], { key: '', value: '' }]
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Variable
                    </button>
                  </div>
                  <div className="space-y-2">
                    {newAccount['variables'].map((variable, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={variable.key}
                          onChange={(e) => {
                            const updatedVariables = [...newAccount['variables']];
                            updatedVariables[index] = { ...variable, key: e.target.value };
                            setNewAccount({
                              ...newAccount,
                              'variables': updatedVariables
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={variable.value}
                          onChange={(e) => {
                            const updatedVariables = [...newAccount['variables']];
                            updatedVariables[index] = { ...variable, value: e.target.value };
                            setNewAccount({
                              ...newAccount,
                              'variables': updatedVariables
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedVariables = newAccount['variables'].filter((_, i) => i !== index);
                            setNewAccount({
                              ...newAccount,
                              'variables': updatedVariables
                            });
                          }}
                          className="px-2 py-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newAccount.tags.join(', ')}
                    onChange={(e) => setNewAccount({
                      ...newAccount,
                      'tags': e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsAddingAccount(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAccount}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Method Modal */}
        {isAddingMethod && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">
                {editingMethod ? 'Edit Method' : 'Create New Method'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method Name *
                  </label>
                  <input
                    type="text"
                    value={newMethod['namespace-method-name']}
                    onChange={(e) => setNewMethod({
                      ...newMethod,
                      'namespace-method-name': e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method Type *
                  </label>
                  <select
                    value={newMethod['namespace-method-type']}
                    onChange={(e) => setNewMethod({
                      ...newMethod,
                      'namespace-method-type': e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL Override
                  </label>
                  <input
                    type="text"
                    value={newMethod['namespace-method-url-override']}
                    onChange={(e) => setNewMethod({
                      ...newMethod,
                      'namespace-method-url-override': e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Query Parameters
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewMethod({
                        ...newMethod,
                        'namespace-method-queryParams': [...newMethod['namespace-method-queryParams'], { key: '', value: '' }]
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Query Parameter
                    </button>
                  </div>
                  <div className="space-y-2">
                    {newMethod['namespace-method-queryParams'].map((param, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={param.key}
                          onChange={(e) => {
                            const updatedParams = [...newMethod['namespace-method-queryParams']];
                            updatedParams[index] = { ...param, key: e.target.value };
                            setNewMethod({
                              ...newMethod,
                              'namespace-method-queryParams': updatedParams
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={param.value}
                          onChange={(e) => {
                            const updatedParams = [...newMethod['namespace-method-queryParams']];
                            updatedParams[index] = { ...param, value: e.target.value };
                            setNewMethod({
                              ...newMethod,
                              'namespace-method-queryParams': updatedParams
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedParams = newMethod['namespace-method-queryParams'].filter((_, i) => i !== index);
                            setNewMethod({
                              ...newMethod,
                              'namespace-method-queryParams': updatedParams
                            });
                          }}
                          className="px-2 py-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Headers
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewMethod({
                        ...newMethod,
                        'namespace-method-header': [...newMethod['namespace-method-header'], { key: '', value: '' }]
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Header
                    </button>
                  </div>
                  <div className="space-y-2">
                    {newMethod['namespace-method-header'].map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => {
                            const updatedHeaders = [...newMethod['namespace-method-header']];
                            updatedHeaders[index] = { ...header, key: e.target.value };
                            setNewMethod({
                              ...newMethod,
                              'namespace-method-header': updatedHeaders
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => {
                            const updatedHeaders = [...newMethod['namespace-method-header']];
                            updatedHeaders[index] = { ...header, value: e.target.value };
                            setNewMethod({
                              ...newMethod,
                              'namespace-method-header': updatedHeaders
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHeaders = newMethod['namespace-method-header'].filter((_, i) => i !== index);
                            setNewMethod({
                              ...newMethod,
                              'namespace-method-header': updatedHeaders
                            });
                          }}
                          className="px-2 py-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newMethod.tags.join(', ')}
                    onChange={(e) => setNewMethod({
                      ...newMethod,
                      'tags': e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="save-data"
                    checked={newMethod['save-data']}
                    onChange={(e) => setNewMethod({
                      ...newMethod,
                      'save-data': e.target.checked
                    })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="save-data" className="text-sm text-gray-700">
                    Save Data
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsAddingMethod(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMethod}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingMethod ? 'Update Method' : 'Create Method'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NamespaceDetailPage;
