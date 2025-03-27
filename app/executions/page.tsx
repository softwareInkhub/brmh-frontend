'use client';

import React, { useState, useEffect } from 'react';
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

const ExecutionsPage = () => {
  const searchParams = useSearchParams();
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set());

  // Effect to read execution ID from URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setCurrentExecutionId(id);
    }
  }, [searchParams]);

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

  // Function to fetch execution logs
  const fetchExecutionLogs = async () => {
    if (!currentExecutionId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/dynamodb/tables/executions/query`, {
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
      }
    } catch (error) {
      console.error('Error fetching execution logs:', error);
      setIsPolling(false);
    }
  };

  // Effect to start polling when execution ID is set
  useEffect(() => {
    if (currentExecutionId) {
      setIsPolling(true);
      setExecutionLogs([]); // Clear previous logs
      setExpandedExecutions(new Set()); // Reset expanded state
    }
  }, [currentExecutionId]);

  // Polling effect
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (isPolling && currentExecutionId) {
      fetchExecutionLogs(); // Initial fetch
      pollInterval = setInterval(fetchExecutionLogs, 1000); // Poll every second
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
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
    if (log['exec-id'] === log['child-exec-id']) {
      // This is a parent log
      acc.set(log['exec-id'], {
        parent: log,
        children: []
      });
    } else {
      // This is a child log
      const group = acc.get(log['exec-id']);
      if (group) {
        group.children.push(log);
      }
    }
    return acc;
  }, new Map());

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Execution Logs</h1>
        
        {/* Input for execution ID */}
        <div className="mb-6">
          <input
            type="text"
            value={currentExecutionId || ''}
            onChange={(e) => setCurrentExecutionId(e.target.value)}
            placeholder="Enter Execution ID"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Execution logs display */}
        <div className="space-y-4">
          {Array.from(groupedLogs.values()).map(({ parent, children }) => (
            <div key={parent['exec-id']} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Parent execution header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                onClick={() => toggleExpansion(parent['exec-id'])}
              >
                <div className="flex items-center gap-4">
                  {expandedExecutions.has(parent['exec-id']) ? (
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
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(parent.data.status)}`}>
                    {parent.data.status || 'started'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Items: {parent.data['total-items-processed']}
                  </span>
                </div>
              </div>

              {/* Child executions */}
              {expandedExecutions.has(parent['exec-id']) && (
                <div className="border-t border-gray-200">
                  <div className="divide-y divide-gray-200">
                    {children.map((child: ExecutionLog) => (
                      <div key={child['child-exec-id']} className="p-4 pl-12 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Iteration {child.data['iteration-no']}
                            </div>
                            <div className="text-sm text-gray-500">
                              Items in page: {child.data['items-in-current-page']}
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

        {/* Loading state */}
        {isPolling && (
          <div className="mt-4 text-center text-gray-500">
            Polling for updates...
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionsPage;