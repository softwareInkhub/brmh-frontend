'use client';
import React, { useState, useEffect } from 'react';
import { NamespaceInput } from '../types';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Copy, Globe, Tag, Clock, Database, Server, CheckCircle, Save, Box } from 'react-feather';
import { useRouter } from 'next/navigation';

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

interface Account {
  'namespace-id': string;
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-account-url-override'?: string;
  'namespace-account-header': KeyValuePair[];
  'variables': KeyValuePair[];
  'tags': string[];
}

interface Namespace {
  'namespace-id': string;
  'namespace-name': string;
  'namespace-url': string;
  'tags': string[];
}

interface EditFormData {
  account: {
    'namespace-account-name': string;
    'namespace-account-url-override': string;
    'namespace-account-header': KeyValuePair[];
    'variables': KeyValuePair[];
    'tags': string[];
  };
  method: {
    'namespace-method-name': string;
    'namespace-method-type': string;
    'namespace-method-url-override': string;
    'namespace-method-queryParams': KeyValuePair[];
    'namespace-method-header': KeyValuePair[];
    'save-data': boolean;
    'tags': string[];
  };
}

/**
 * NamespacePage Component
 * Displays a list of namespaces with their basic information and statistics
 */
const NamespacePage = () => {
  const router = useRouter();
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [methodSearchQuery, setMethodSearchQuery] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState<Namespace | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [isAddingNamespace, setIsAddingNamespace] = useState(false);
  const [newNamespace, setNewNamespace] = useState<NamespaceInput>({
    'namespace-name': '',
    'namespace-url': '',
    tags: []
  });
  const [editingNamespace, setEditingNamespace] = useState<Namespace | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingMethod, setEditingMethod] = useState<Method | null>(null);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditingMethod, setIsEditingMethod] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    account: {
      'namespace-account-name': '',
      'namespace-account-url-override': '',
      'namespace-account-header': [],
      'variables': [],
      'tags': []
    },
    method: {
      'namespace-method-name': '',
      'namespace-method-type': 'GET',
      'namespace-method-url-override': '',
      'namespace-method-queryParams': [],
      'namespace-method-header': [],
      'save-data': false,
      'tags': []
    }
  });

  // Filter functions
  const filteredNamespaces = namespaces.filter(namespace => {
    const searchLower = searchQuery.toLowerCase();
    return (
      namespace['namespace-name'].toLowerCase().includes(searchLower) ||
      namespace['namespace-url'].toLowerCase().includes(searchLower) ||
      namespace.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  const filteredAccounts = accounts.filter(account => {
    const searchLower = accountSearchQuery.toLowerCase();
    return (
      account['namespace-account-name'].toLowerCase().includes(searchLower) ||
      account['namespace-account-url-override']?.toLowerCase().includes(searchLower) ||
      account.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  const filteredMethods = methods.filter(method => {
    const searchLower = methodSearchQuery.toLowerCase();
    return (
      method['namespace-method-name'].toLowerCase().includes(searchLower) ||
      method['namespace-method-type'].toLowerCase().includes(searchLower) ||
      method.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  // Fetch accounts and methods for selected namespace
  const fetchNamespaceDetails = async (namespaceId: string) => {
    try {
      console.log('Fetching namespace details for ID:', namespaceId);
      
      const [accountsResponse, methodsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/namespaces/${namespaceId}/accounts`),
        fetch(`${API_BASE_URL}/namespaces/${namespaceId}/methods`)
      ]);

      console.log('Accounts Response Status:', accountsResponse.status);
      console.log('Methods Response Status:', methodsResponse.status);
      
      if (!accountsResponse.ok || !methodsResponse.ok) {
        throw new Error('Failed to fetch namespace details');
      }

      const accountsData = await accountsResponse.json();
      const methodsData = await methodsResponse.json();

      console.log('Accounts Response Data:', JSON.stringify(accountsData, null, 2));
      console.log('Methods Response Data:', JSON.stringify(methodsData, null, 2));

      setAccounts(accountsData || []);
      setMethods(methodsData || []);
    } catch (error) {
      console.error('Error fetching namespace details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    }
  };

  /**
   * Handles namespace selection
   */
  const handleNamespaceClick = (namespace: Namespace, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('button')) {
      setSelectedNamespace(namespace);
      fetchNamespaceDetails(namespace['namespace-id']);
    }
  };

  /**
   * Fetches all namespaces from the API and transforms DynamoDB attribute values
   */
  const fetchNamespaces = async () => {
    try {
      console.log('Fetching namespaces...');
      const response = await fetch(`${API_BASE_URL}/namespaces`);
      const responseData = await response.json();
      console.log('Fetched namespaces:', responseData);

      // Transform the data structure
      const transformedData = responseData.map((item: any) => ({
        'namespace-id': item.id,
        'namespace-name': item.data['namespace-name'].S,
        'namespace-url': item.data['namespace-url'].S,
        'tags': Array.isArray(item.data.tags?.L) ? item.data.tags.L.map((tag: any) => tag.S) : []
      }));

      console.log('Transformed namespaces:', transformedData);
      setNamespaces(transformedData);
    } catch (error) {
      console.error('Error fetching namespaces:', error);
    }
  };

  /**
   * Creates a new namespace
   */
  const handleCreateNamespace = async () => {
    try {
      if (!newNamespace['namespace-name'] || !newNamespace['namespace-url']) {
        alert('Please fill in all required fields');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/namespaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNamespace),
      });

      if (!response.ok) {
        throw new Error('Failed to create namespace');
      }

      const data = await response.json();
      setNamespaces([...namespaces, data]);
      setIsAddingNamespace(false);
      setNewNamespace({
        'namespace-name': '',
        'namespace-url': '',
        tags: []
      });
    } catch (error) {
      console.error('Error creating namespace:', error);
      alert('Failed to create namespace');
    }
  };

  /**
   * Handles namespace deletion
   */
  const handleDeleteNamespace = async (namespaceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this namespace?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/namespaces/${namespaceId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete namespace');
        }

        setNamespaces(namespaces.filter(ns => ns['namespace-id'] !== namespaceId));
      } catch (error) {
        console.error('Error deleting namespace:', error);
        alert('Failed to delete namespace');
      }
    }
  };

  /**
   * Handles editing a namespace
   */
  const handleEditNamespace = async () => {
    try {
      if (!editingNamespace) return;

      const response = await fetch(`${API_BASE_URL}/namespaces/${editingNamespace['namespace-id']}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'namespace-name': newNamespace['namespace-name'],
          'namespace-url': newNamespace['namespace-url'],
          'tags': newNamespace.tags
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update namespace');
      }

      const updatedNamespace = await response.json();
      setNamespaces(namespaces.map(ns => 
        ns['namespace-id'] === editingNamespace['namespace-id'] ? updatedNamespace : ns
      ));
      setIsAddingNamespace(false);
      setEditingNamespace(null);
      setNewNamespace({
        'namespace-name': '',
        'namespace-url': '',
        tags: []
      });
    } catch (error) {
      console.error('Error updating namespace:', error);
      alert('Failed to update namespace');
    }
  };

  /**
   * Opens the edit form for a namespace
   */
  const handleEditClick = (namespace: Namespace, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingNamespace(namespace);
    setNewNamespace({
      'namespace-name': namespace['namespace-name'],
      'namespace-url': namespace['namespace-url'],
      'tags': namespace.tags
    });
    setIsAddingNamespace(true);
  };

  /**
   * Handles account deletion
   */
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

  /**
   * Opens the edit form for an account
   */
  const handleEditAccount = (account: Account) => {
    console.log('Editing account:', account);
    setEditingAccount(account);
    setEditFormData({
      ...editFormData,
      account: {
        'namespace-account-name': account['namespace-account-name'],
        'namespace-account-url-override': account['namespace-account-url-override'] || '',
        'namespace-account-header': account['namespace-account-header'] || [],
        'variables': account['variables'] || [],
        'tags': account.tags || []
      }
    });
    setIsEditingAccount(true);
  };

  /**
   * Handles method deletion
   */
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

  /**
   * Opens the edit form for a method
   */
  const handleEditMethod = (method: Method) => {
    console.log('Editing method:', method);
    setEditingMethod(method);
    setEditFormData({
      ...editFormData,
      method: {
        'namespace-method-name': method['namespace-method-name'],
        'namespace-method-type': method['namespace-method-type'],
        'namespace-method-url-override': method['namespace-method-url-override'] || '',
        'namespace-method-queryParams': method['namespace-method-queryParams'] || [],
        'namespace-method-header': method['namespace-method-header'] || [],
        'save-data': method['save-data'],
        'tags': method.tags || []
      }
    });
    setIsEditingMethod(true);
  };

  const handleUpdateAccount = async () => {
    try {
      if (!editingAccount || !selectedNamespace) return;

      const payload = {
        'namespace-id': editingAccount['namespace-id'],
        'namespace-account-name': editFormData.account['namespace-account-name'],
        'namespace-account-url-override': editFormData.account['namespace-account-url-override'],
        'namespace-account-header': editFormData.account['namespace-account-header'],
        'variables': editFormData.account['variables'],
        'tags': editFormData.account.tags
      };

      console.log('Updating account with payload:', payload);
      console.log('Account ID:', editingAccount['namespace-account-id']);

      const response = await fetch(`${API_BASE_URL}/accounts/${editingAccount['namespace-account-id']}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Update account response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        throw new Error(errorData?.message || `Failed to update account (${response.status})`);
      }

      const updatedAccount = await response.json();
      console.log('Updated account:', updatedAccount);

      setAccounts(accounts.map(acc => 
        acc['namespace-account-id'] === editingAccount['namespace-account-id'] ? updatedAccount : acc
      ));
      setIsEditingAccount(false);
      setEditingAccount(null);
      
      // Refresh accounts list
      if (selectedNamespace) {
        fetchNamespaceDetails(selectedNamespace['namespace-id']);
      }
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Failed to update account: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleUpdateMethod = async () => {
    try {
      if (!editingMethod || !selectedNamespace) return;

      const payload = {
        'namespace-id': editingMethod['namespace-id'],
        'namespace-method-name': editFormData.method['namespace-method-name'],
        'namespace-method-type': editFormData.method['namespace-method-type'],
        'namespace-method-url-override': editFormData.method['namespace-method-url-override'],
        'namespace-method-queryParams': editFormData.method['namespace-method-queryParams'],
        'namespace-method-header': editFormData.method['namespace-method-header'],
        'save-data': editFormData.method['save-data'],
        'tags': editFormData.method.tags,
        'isInitialized': editingMethod.isInitialized || false
      };

      console.log('Updating method with payload:', payload);
      console.log('Method ID:', editingMethod['namespace-method-id']);

      const response = await fetch(`${API_BASE_URL}/methods/${editingMethod['namespace-method-id']}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Update method response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        throw new Error(errorData?.message || `Failed to update method (${response.status})`);
      }

      const updatedMethod = await response.json();
      console.log('Updated method:', updatedMethod);

      setMethods(methods.map(m => 
        m['namespace-method-id'] === editingMethod['namespace-method-id'] ? updatedMethod : m
      ));
      setIsEditingMethod(false);
      setEditingMethod(null);

      // Refresh methods list
      if (selectedNamespace) {
        fetchNamespaceDetails(selectedNamespace['namespace-id']);
      }
    } catch (error) {
      console.error('Error updating method:', error);
      alert('Failed to update method: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Fetch namespaces on component mount
  useEffect(() => {
    fetchNamespaces();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-3 sm:p-6 md:p-8 max-w-[1920px] mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search namespaces..."
                value={searchQuery}
                className="w-full px-4 py-2.5 pl-10 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  title="Clear search"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setEditingNamespace(null);
                setNewNamespace({
                  'namespace-name': '',
                  'namespace-url': '',
                  tags: []
                });
                setIsAddingNamespace(true);
              }}
              className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
              title="Create Namespace"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Namespaces Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-3 sm:p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Namespaces</h2>
          </div>
          <div className="overflow-y-auto max-h-[180px] sm:max-h-[200px] p-3 sm:p-4">
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
              {filteredNamespaces.length > 0 ? (
                filteredNamespaces.map((namespace) => (
                  <div 
                    key={namespace['namespace-id']} 
                    className={`bg-white rounded-lg shadow-sm border ${
                      selectedNamespace?.['namespace-id'] === namespace['namespace-id']
                        ? 'border-blue-500'
                        : 'border-gray-100'
                    } px-2 py-2 sm:px-3 sm:py-2.5 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group relative`}
                    onClick={(e) => handleNamespaceClick(namespace, e)}
                  >
                    <h2 className="text-xs sm:text-sm font-medium text-gray-800 truncate pr-8 sm:pr-14 group-hover:text-blue-600 transition-colors">
                      {namespace['namespace-name'] || 'Unnamed Namespace'}
                    </h2>
                    <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1">
                      <button
                        onClick={(e) => handleEditClick(namespace, e)}
                        className="p-1 sm:p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-all"
                        title="Edit Namespace"
                      >
                        <Edit2 size={12} className="sm:hidden" />
                        <Edit2 size={14} className="hidden sm:block" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteNamespace(namespace['namespace-id'], e)}
                        className="p-1 sm:p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-all"
                        title="Delete Namespace"
                      >
                        <Trash2 size={12} className="sm:hidden" />
                        <Trash2 size={14} className="hidden sm:block" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex items-center justify-center py-12 text-gray-500">
                  <p className="text-center">No namespaces found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accounts and Methods Section */}
        {selectedNamespace && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
              <div className="overflow-y-auto max-h-[calc(100vh-20rem)] sm:max-h-[calc(100vh-24rem)] p-3 sm:p-4 space-y-2">
                {accounts.map((account) => (
                  <div key={account['namespace-account-id']} className="p-4 border border-gray-100 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-gray-900 mb-1">{account['namespace-account-name']}</p>
                        <p className="text-sm text-gray-600 mb-2">ID: {account['namespace-account-id']}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            console.log('Opening edit account modal for:', account);
                            handleEditAccount(account);
                          }}
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
                          {account['namespace-account-header'].map((header, headerIndex) => (
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
                          {account['variables'].map((variable, variableIndex) => (
                            <div key={variableIndex} className="flex gap-2 text-sm">
                              <span className="text-gray-600">{variable.key}:</span>
                              <span className="text-gray-900">{variable.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {account.tags && account.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {account.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {filteredAccounts.length === 0 && (
                  <div className="text-center py-4 text-gray-500">No accounts found</div>
                )}
              </div>
            </div>

            {/* Methods Section */}
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
              <div className="overflow-y-auto max-h-[calc(100vh-20rem)] sm:max-h-[calc(100vh-24rem)] p-3 sm:p-4 space-y-2">
                {methods.map((method) => (
                  <div key={method['namespace-method-id']} className="p-3 bg-gray-50 rounded-lg">
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            console.log('Opening edit method modal for:', method);
                            handleEditMethod(method);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-all"
                          title="Edit Method"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMethod(method['namespace-method-id'])}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-all"
                          title="Delete Method"
                        >
                          <Trash2 size={14} />
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
                        <div className="bg-gray-100 rounded-lg p-3">
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
                        <div className="bg-gray-100 rounded-lg p-3">
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
                          <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 flex items-center gap-1">
                            Not Initialized
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredMethods.length === 0 && (
                  <div className="text-center py-4 text-gray-500">No methods found</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Namespace Modal */}
        {isAddingNamespace && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingNamespace ? 'Edit Namespace' : 'Create New Namespace'}
                </h2>
                <button
                  onClick={() => {
                    setIsAddingNamespace(false);
                    setEditingNamespace(null);
                    setNewNamespace({
                      'namespace-name': '',
                      'namespace-url': '',
                      tags: []
                    });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Namespace Name *</label>
                  <input
                    type="text"
                    value={newNamespace['namespace-name']}
                    onChange={(e) => setNewNamespace({ ...newNamespace, 'namespace-name': e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter namespace name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Namespace URL *</label>
                  <input
                    type="text"
                    value={newNamespace['namespace-url']}
                    onChange={(e) => setNewNamespace({ ...newNamespace, 'namespace-url': e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter namespace URL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    value={newNamespace.tags.join(', ')}
                    onChange={(e) => setNewNamespace({
                      ...newNamespace,
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    })}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter tags (comma-separated)"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsAddingNamespace(false);
                    setEditingNamespace(null);
                    setNewNamespace({
                      'namespace-name': '',
                      'namespace-url': '',
                      tags: []
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingNamespace ? handleEditNamespace : handleCreateNamespace}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  {editingNamespace ? 'Update Namespace' : 'Create Namespace'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Account Modal */}
        {isEditingAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">Edit Account</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.account['namespace-account-name']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      account: {
                        ...editFormData.account,
                        'namespace-account-name': e.target.value
                      }
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
                    value={editFormData.account['namespace-account-url-override']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      account: {
                        ...editFormData.account,
                        'namespace-account-url-override': e.target.value
                      }
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        account: {
                          ...editFormData.account,
                          'namespace-account-header': [...editFormData.account['namespace-account-header'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Header
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.account['namespace-account-header'].map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.account['namespace-account-header']];
                            updatedHeaders[index] = { ...header, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'namespace-account-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.account['namespace-account-header']];
                            updatedHeaders[index] = { ...header, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'namespace-account-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHeaders = editFormData.account['namespace-account-header'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'namespace-account-header': updatedHeaders
                              }
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        account: {
                          ...editFormData.account,
                          'variables': [...editFormData.account['variables'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Variable
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.account['variables'].map((variable, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={variable.key}
                          onChange={(e) => {
                            const updatedVariables = [...editFormData.account['variables']];
                            updatedVariables[index] = { ...variable, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'variables': updatedVariables
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={variable.value}
                          onChange={(e) => {
                            const updatedVariables = [...editFormData.account['variables']];
                            updatedVariables[index] = { ...variable, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'variables': updatedVariables
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedVariables = editFormData.account['variables'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'variables': updatedVariables
                              }
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
                    value={editFormData.account.tags.join(', ')}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      account: {
                        ...editFormData.account,
                        'tags': e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsEditingAccount(false);
                    setEditingAccount(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAccount}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Method Modal */}
        {isEditingMethod && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">Edit Method</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.method['namespace-method-name']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'namespace-method-name': e.target.value
                      }
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
                    value={editFormData.method['namespace-method-type']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'namespace-method-type': e.target.value
                      }
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
                    value={editFormData.method['namespace-method-url-override']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'namespace-method-url-override': e.target.value
                      }
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        method: {
                          ...editFormData.method,
                          'namespace-method-queryParams': [...editFormData.method['namespace-method-queryParams'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Query Parameter
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.method['namespace-method-queryParams'].map((param, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={param.key}
                          onChange={(e) => {
                            const updatedParams = [...editFormData.method['namespace-method-queryParams']];
                            updatedParams[index] = { ...param, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-queryParams': updatedParams
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={param.value}
                          onChange={(e) => {
                            const updatedParams = [...editFormData.method['namespace-method-queryParams']];
                            updatedParams[index] = { ...param, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-queryParams': updatedParams
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedParams = editFormData.method['namespace-method-queryParams'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-queryParams': updatedParams
                              }
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        method: {
                          ...editFormData.method,
                          'namespace-method-header': [...editFormData.method['namespace-method-header'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Header
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.method['namespace-method-header'].map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.method['namespace-method-header']];
                            updatedHeaders[index] = { ...header, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.method['namespace-method-header']];
                            updatedHeaders[index] = { ...header, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHeaders = editFormData.method['namespace-method-header'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-header': updatedHeaders
                              }
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
                    value={editFormData.method.tags.join(', ')}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'tags': e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="save-data"
                    checked={editFormData.method['save-data']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'save-data': e.target.checked
                      }
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
                  onClick={() => {
                    setIsEditingMethod(false);
                    setEditingMethod(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateMethod}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Method
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NamespacePage;