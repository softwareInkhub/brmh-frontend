'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';

interface Namespace {
  'namespace-id': string;
  'namespace-name': string;
  'namespace-url': string;
  tags: string[];
}

const DatabasePage = () => {
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatabaseNamespaces = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/namespaces`);
        if (!response.ok) {
          throw new Error('Failed to fetch namespaces');
        }
        const data = await response.json();
        
        // Filter namespaces with database-related tags
        const databaseNamespaces = data.filter((namespace: Namespace) => 
          namespace.tags?.some(tag => 
            tag.toLowerCase() === 'database' || 
            tag.toLowerCase() === 'db'
          )
        );
        
        setNamespaces(databaseNamespaces);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDatabaseNamespaces();
  }, []);

  if (loading) {
    return <div className="p-8">Loading database namespaces...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Database Namespaces</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {namespaces.map((namespace) => (
          <Card key={namespace['namespace-id']}>
            <CardHeader>
              <CardTitle>{namespace['namespace-name']}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-2">{namespace['namespace-url']}</p>
              <div className="flex flex-wrap gap-2">
                {namespace.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {namespaces.length === 0 && (
          <div className="col-span-full text-center text-gray-500">
            No database namespaces found
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabasePage;