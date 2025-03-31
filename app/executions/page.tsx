'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { ChevronDown, ChevronRight } from 'react-feather';
import { useSearchParams } from 'next/navigation';

interface ExecutionLog {
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
    'status'?: string;
    'is-last': boolean;
  };
}

interface DynamoDBItem {
  'exec-id': { S: string };
  'child-exec-id': { S: string };
  data: {
    M: {
      'request-url'?: { S: string };
      'status'?: { S: string };
      'total-items-processed'?: { N: string };
      'iteration-no'?: { N: string };
      'items-in-current-page'?: { N: string };
      'response-status'?: { N: string };
      'pagination-type'?: { S: string };
      'timestamp'?: { S: string };
      'is-last'?: { BOOL: boolean };
    };
  };
}

const ExecutionsContent = () => {
  const searchParams = useSearchParams();
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set());
  const [allExecutions, setAllExecutions] = useState<ExecutionLog[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;  // Maximum number of empty result retries

  // Effect to fetch all executions
  useEffect(() => {
    fetchAllExecutions();
  }, []);

  // Effect to read execution ID from URL and localStorage
  useEffect(() => {
    const id = searchParams.get('id') || localStorage.getItem('currentExecutionId');
    if (id) {
      console.log('Setting execution ID:', id);
      setCurrentExecutionId(id);
      setIsPolling(true);
      setExecutionLogs([]); // Clear previous logs
      setExpandedExecutions(new Set()); // Reset expanded state
    }
  }, [searchParams]);

  // Function to fetch all executions
  const fetchAllExecutions = async () => {
    try {
      console.log('Fetching all executions...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dynamodb/tables/executions/items`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch executions');
      }

      const data = await response.json();
      console.log('Received executions data:', data);
      const logs = data.items.map((item: DynamoDBItem) => {
        // Convert DynamoDB format to plain values
        return {
          'exec-id': item['exec-id'].S || '',
          'child-exec-id': item['child-exec-id'].S || '',
          data: {
            'request-url': item.data?.M?.['request-url']?.S || '',
            'status': item.data?.M?.status?.S || 'In Progress',
            'total-items-processed': parseInt(item.data?.M?.['total-items-processed']?.N || '0'),
            'iteration-no': parseInt(item.data?.M?.['iteration-no']?.N || '0'),
            'items-in-current-page': parseInt(item.data?.M?.['items-in-current-page']?.N || '0'),
            'response-status': parseInt(item.data?.M?.['response-status']?.N || '0'),
            'pagination-type': item.data?.M?.['pagination-type']?.S || '',
            'timestamp': item.data?.M?.timestamp?.S || '',
            'is-last': item.data?.M?.['is-last']?.BOOL || false
          }
        };
      });
      
      // Sort logs by timestamp in descending order (newest first)
      const sortedLogs = logs.sort((a: ExecutionLog, b: ExecutionLog) => {
        const dateA = new Date(a.data.timestamp);
        const dateB = new Date(b.data.timestamp);
        return dateB.getTime() - dateA.getTime();
      });

      console.log('Processed logs:', sortedLogs);
      setAllExecutions(sortedLogs);
    } catch (error) {
      console.error('Error fetching all executions:', error);
    }
  };

  // Function to clear execution ID from URL and localStorage
  const clearExecutionId = () => {
    // Clear from localStorage
    localStorage.removeItem('currentExecutionId');
    // Clear from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url);
    // Clear from state
    setCurrentExecutionId(null);
  };

  // Function to fetch execution logs for a specific execution
  const fetchExecutionLogs = async () => {
    if (!currentExecutionId) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dynamodb/tables/executions/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          KeyConditionExpression: "#execId = :execId",
          ExpressionAttributeNames: {
            "#execId": "exec-id"
          },
          ExpressionAttributeValues: {
            ":execId": currentExecutionId
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch execution logs');
      }

      const data = await response.json();
      
      // If no items are found, increment retry counter
      if (!data.items || data.items.length === 0) {
        setRetryCount(prev => prev + 1);
        if (retryCount >= MAX_RETRIES) {
          console.log('No execution found after maximum retries, stopping polling');
          setIsPolling(false);
          clearExecutionId();
          return;
        }
        return;
      }
      
      // Reset retry counter if we found items
      setRetryCount(0);
      
      const logs = data.items as ExecutionLog[];
      
      // Sort logs: parent first, then children by iteration number
      const sortedLogs = logs.sort((a, b) => {
        if (a['exec-id'] === a['child-exec-id'] && b['exec-id'] !== b['child-exec-id']) return -1;
        if (a['exec-id'] !== a['child-exec-id'] && b['exec-id'] === b['child-exec-id']) return 1;
        return a.data['iteration-no'] - b.data['iteration-no'];
      });

      setExecutionLogs(sortedLogs);

      // Check if we should stop polling
      const parentLog = logs.find(log => log['exec-id'] === log['child-exec-id']);
      if (parentLog?.data.status === 'completed' || parentLog?.data.status === 'error') {
        setIsPolling(false);
        clearExecutionId(); // Clear execution ID when completed or error
      }
    } catch (error) {
      console.error('Error fetching execution logs:', error);
      setIsPolling(false);
      clearExecutionId(); // Clear execution ID on error
    }
  };

  // Polling effect
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (isPolling && currentExecutionId) {
      console.log('Starting polling for execution ID:', currentExecutionId);
      fetchExecutionLogs(); // Initial fetch
      pollInterval = setInterval(fetchExecutionLogs, 2000); // Poll every 2 seconds instead of 1
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      // Reset retry counter when polling stops
      setRetryCount(0);
    };
  }, [isPolling, currentExecutionId]);

  // Function to get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'inProgress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Group logs by parent execution
  const groupedLogs = executionLogs.reduce((acc, log) => {
    const key = log['exec-id'];
    if (log['exec-id'] === log['child-exec-id']) {
      // This is a parent log
      acc.set(key, {
        parent: log,
        children: []
      });
    } else {
      // This is a child log
      const group = acc.get(key);
      if (group) {
        group.children.push(log);
      }
    }
    return acc;
  }, new Map());

  // Group all executions by parent execution
  const groupedAllExecutions = allExecutions.reduce((acc, log) => {
    const key = log['exec-id'];
    if (log['exec-id'] === log['child-exec-id']) {
      // This is a parent log
      acc.set(key, {
        parent: log,
        children: acc.get(key)?.children || []
      });
    } else {
      // This is a child log
      if (!acc.has(key)) {
        // If parent doesn't exist yet, create a placeholder
        acc.set(key, {
          parent: null,
          children: []
        });
      }
      acc.get(key)?.children.push(log);
    }
    return acc;
  }, new Map());

  // Sort children by iteration number for all executions
  groupedAllExecutions.forEach((group) => {
    if (group.children) {
      group.children.sort((a: ExecutionLog, b: ExecutionLog) => a.data['iteration-no'] - b.data['iteration-no']);
    }
  });

  // Function to toggle execution expansion
  const toggleExpansion = (execId: string) => {
    const newExpanded = new Set(expandedExecutions);
    if (newExpanded.has(execId)) {
      newExpanded.delete(execId);
    } else {
      newExpanded.add(execId);
    }
    setExpandedExecutions(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Execution Logs</h1>

        {/* Current Execution Section - Always visible */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Execution</h2>
          {currentExecutionId ? (
            <div className="space-y-4">
              {Array.from(groupedLogs.entries()).map(([execId, { parent, children }]) => (
                <div key={execId} className="bg-white rounded-lg shadow-lg border-2 border-blue-200 overflow-hidden">
                  {/* Parent execution header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                    onClick={() => toggleExpansion(execId)}
                  >
                    <div className="flex items-center gap-4">
                      {expandedExecutions.has(execId) ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          Execution ID: {parent['exec-id']}
                        </div>
                        <div className="text-sm text-gray-500">
                          URL: {parent.data['request-url']}
                        </div>
                        <div className="text-sm text-gray-500">
                          Status: {parent.data.status || 'In Progress'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Items Processed: {parent.data['total-items-processed']}
                        </div>
                        <div className="text-xs text-gray-400">
                          {parent.data.timestamp && new Date(parent.data.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(parent.data.status)}`}>
                        {parent.data.status || 'started'}
                      </span>
                    </div>
                  </div>

                  {/* Child executions */}
                  {expandedExecutions.has(execId) && children.length > 0 && (
                    <div className="border-t border-gray-200">
                      <div className="divide-y divide-gray-200">
                        {children.map((child: ExecutionLog) => (
                          <div key={`${execId}-${child['child-exec-id']}`} className="p-4 pl-12 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  Iteration {child.data['iteration-no']}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Items in page: {child.data['items-in-current-page']}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Response Status: {child.data['response-status']}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}>
                                  Status: {child.data['response-status']}
                                </span>
                                {child.data['is-last'] && (
                                  <span className="text-xs text-gray-500">Final Iteration</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-4 text-gray-500">
              No active execution
            </div>
          )}
        </div>

        {/* Loading state */}
        {isPolling && (
          <div className="mt-4 mb-4 text-center text-gray-500">
            Polling for updates...
          </div>
        )}

        {/* All Executions List */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Executions</h2>
          {allExecutions.length === 0 ? (
            <div className="text-gray-500">No executions found</div>
          ) : (
            <div className="space-y-4">
              {Array.from(groupedAllExecutions.entries()).map(([execId, { parent, children }]) => (
                <div key={execId} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Parent execution header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                    onClick={() => {
                      toggleExpansion(execId);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {expandedExecutions.has(execId) ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          Execution ID: {parent?.['exec-id']}
                        </div>
                        <div className="text-sm text-gray-500">
                          Child Execution ID: {parent?.['child-exec-id']}
                        </div>
                        {parent?.data && (
                          <>
                            <div className="text-sm text-gray-500">
                              URL: {parent.data['request-url']}
                            </div>
                            <div className="text-sm text-gray-500">
                              Status: {parent.data['status']}
                            </div>
                            <div className="text-sm text-gray-500">
                              Items Processed: {parent.data['total-items-processed']}
                            </div>
                            <div className="text-xs text-gray-400">
                              {parent.data.timestamp && new Date(parent.data.timestamp).toLocaleString()}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {parent?.data && parent.data.status && (
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(parent.data.status)}`}>
                          {parent.data.status}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Child executions in All Executions section */}
                  {expandedExecutions.has(execId) && children && children.length > 0 && (
                    <div className="border-t border-gray-200">
                      <div className="divide-y divide-gray-200">
                        {children.map((child: ExecutionLog) => (
                          <div key={`${execId}-${child['child-exec-id']}`} className="p-4 pl-12 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  Iteration {child.data['iteration-no']}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Items in page: {child.data['items-in-current-page']}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Response Status: {child.data['response-status']}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Pagination Type: {child.data['pagination-type']}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}>
                                  Status: {child.data['response-status']}
                                </span>
                                {child.data['is-last'] && (
                                  <span className="text-xs text-gray-500">Final Iteration</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ExecutionsPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExecutionsContent />
    </Suspense>
  );
};

export default ExecutionsPage;