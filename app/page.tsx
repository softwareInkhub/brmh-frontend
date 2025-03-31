'use client';

import { useState } from 'react';

export default function Home() {
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Tools</h1>
      <p className="text-gray-600 mb-8">
        Select a service from the sidebar to get started with API testing and management.
      </p>
    </div>
  );
}
