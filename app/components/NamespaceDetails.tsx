'use client';

import React, { useState, useEffect } from 'react';
import { Database, Globe, Users, Code } from 'react-feather';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface KeyValuePair {
  key: string;
  value: string;
}

interface Namespace {
  'namespace-id': string;
  'namespace-name': string;
  'namespace-url': string;
  'tags': string[];
}

interface Account {
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-account-url-override': string;
  'namespace-account-header': KeyValuePair[];
  'tags': string[];
}

interface Method {
  'namespace-method-id': string;
  'namespace-method-name': string;
  'namespace-method-type': string;
  'namespace-method-url-override': string;
  'namespace-method-queryParams': KeyValuePair[];
  'namespace-method-header': KeyValuePair[];
  'save-data': boolean;
  'isInitialized': boolean;
  'tags': string[];
}

interface NamespaceDetailsProps {
  onError?: (error: string) => void;
  className?: string;
}

const NamespaceDetails: React.FC<NamespaceDetailsProps> = ({ 
  onError,
  className = ''
}) => {
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [selectedNamespaceId, setSelectedNamespaceId] = useState<string>('');
  const [namespace, setNamespace] = useState<Namespace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchNamespaces = async () => {
    console.log('Starting fetchNamespaces function...');
    try {
      console.log('Making API request to:', `${API_BASE_URL}/namespaces`);
      const response = await fetch(`${API_BASE_URL}/namespaces`);
      console.log('API Response:', response);
      console.log('Response Status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch namespaces: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      console.log('Raw API Response Data:', rawData);

      // Ensure rawData is an array
      if (!Array.isArray(rawData)) {
        console.error('Expected array of namespaces, got:', typeof rawData);
        console.log('Actual data received:', rawData);
        setNamespaces([]);
        setLoading(false);
        return;
      }

      // Transform DynamoDB format to our Namespace interface
      console.log('Starting data transformation...');
      const transformedData = rawData
        .filter((item: any) => {
          const isValid = item && typeof item === 'object';
          if (!isValid) console.log('Filtering out invalid item:', item);
          return isValid;
        })
        .map((item: any) => {
          console.log('Processing namespace item:', item);
          const transformed = {
            'namespace-id': item['namespace-id'] || '',
            'namespace-name': item['namespace-name'] || '',
            'namespace-url': item['namespace-url'] || '',
            'tags': Array.isArray(item.tags) ? item.tags : []
          };
          console.log('Transformed item:', transformed);
          return transformed;
        })
        .filter(item => {
          const hasId = Boolean(item['namespace-id']);
          if (!hasId) console.log('Filtering out item without ID:', item);
          return hasId;
        });

      console.log('Final transformed namespaces:', transformedData);
      setNamespaces(transformedData);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchNamespaces:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      onError?.('Failed to fetch namespaces');
      setNamespaces([]);
      setLoading(false);
    }
  };

  const fetchAccounts = async (id: string) => {
    try {
      const accountsUrl = `${API_BASE_URL}/namespaces/${id}/accounts`;
      console.log('Fetching accounts from:', accountsUrl);
      
      const response = await fetch(accountsUrl);
      console.log('Accounts Response Status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      console.log('Accounts Response Data:', data);
      return data || [];
    } catch (error) {
      console.error('Error fetching accounts:', error);
      onError?.('Failed to fetch accounts');
      return [];
    }
  };

  const fetchMethods = async (id: string) => {
    try {
      const methodsUrl = `${API_BASE_URL}/namespaces/${id}/methods`;
      console.log('Fetching methods from:', methodsUrl);
      
      const response = await fetch(methodsUrl);
      console.log('Methods Response Status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch methods');
      }
      const data = await response.json();
      console.log('Methods Response Data:', data);
      return data || [];
    } catch (error) {
      console.error('Error fetching methods:', error);
      onError?.('Failed to fetch methods');
      return [];
    }
  };

  const handleNamespaceChange = async (id: string) => {
    setSelectedNamespaceId(id);
    if (!id) {
      setNamespace(null);
      setAccounts([]);
      setMethods([]);
      return;
    }

    setLoadingDetails(true);
    setError(null);

    try {
      // Fetch namespace details
      const namespaceResponse = await fetch(`${API_BASE_URL}/namespaces/${id}`);
      if (!namespaceResponse.ok) {
        throw new Error('Failed to fetch namespace details');
      }
      const namespaceData = await namespaceResponse.json();
      setNamespace(namespaceData);

      // Fetch accounts and methods in parallel
      const [accountsData, methodsData] = await Promise.all([
        fetchAccounts(id),
        fetchMethods(id)
      ]);

      setAccounts(accountsData);
      setMethods(methodsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch details';
      console.error('Error fetching details:', error);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    console.log('NamespaceDetails component mounted');
    fetchNamespaces();
  }, []);

  console.log('Current namespaces state:', namespaces);
  console.log('Current loading state:', loading);

  if (loading && !namespaces.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Database className="text-gray-400 animate-pulse" size={24} />
          <p className="text-gray-600">Loading namespaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Namespace Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Select Namespace</h2>
          </div>
          <select
            value={selectedNamespaceId}
            onChange={(e) => handleNamespaceChange(e.target.value)}
            className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option key="default" value="">Select a namespace</option>
            {namespaces.map((ns) => (
              <option key={ns['namespace-id']} value={ns['namespace-id']}>
                {ns['namespace-name'] || ns['namespace-id']}
              </option>
            ))}
          </select>
        </div>

        {loadingDetails ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Database className="text-gray-400 animate-pulse" size={24} />
              <p className="text-gray-600">Loading details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-red-500">
              <p>Error: {error}</p>
              <button 
                onClick={() => selectedNamespaceId && handleNamespaceChange(selectedNamespaceId)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </div>
        ) : namespace ? (
          <>
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
              <div className="flex items-center gap-3 mb-4">
                <Users className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Accounts</h2>
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
                        {account.tags && account.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {account.tags.map((tag: string, tagIndex: number) => (
                              <span key={tagIndex} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
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
                            {account['namespace-account-header'].map((header: KeyValuePair, headerIndex: number) => (
                              <div key={headerIndex} className="flex gap-2 text-sm">
                                <span className="text-gray-600">{header.key}:</span>
                                <span className="text-gray-900">{header.value}</span>
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
              <div className="flex items-center gap-3 mb-4">
                <Code className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Methods</h2>
              </div>
              {methods.length > 0 ? (
                <div className="grid gap-4">
                  {methods.map((method, index) => (
                    <div key={index} className="p-4 border border-gray-100 rounded-lg">
                      {/* Method Header */}
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
                        {method.tags && method.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {method.tags.map((tag: string, tagIndex: number) => (
                              <span key={tagIndex} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
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
                            {method['namespace-method-queryParams'].map((param: KeyValuePair, paramIndex: number) => (
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
                            {method['namespace-method-header'].map((header: KeyValuePair, headerIndex: number) => (
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
                          <span className="text-sm text-gray-600">Initialized:</span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            method['isInitialized'] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {method['isInitialized'] ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No methods found</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default NamespaceDetails; 