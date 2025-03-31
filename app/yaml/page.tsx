'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { toast } from 'sonner';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

interface YamlRecord {
  id: string;
  name: string;
  content: any;
  createdAt: string;
}

const YamlPage = () => {
  const [yamlRecords, setYamlRecords] = useState<YamlRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch YAML records from DynamoDB
  const fetchYamlRecords = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dynamodb/tables/yaml/items`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      setYamlRecords(data.items);
    } catch (error) {
      toast.error('Failed to fetch YAML records');
      console.error('Error fetching records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload and conversion
  const handleUploadYaml = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      toast.error('Please upload a YAML file');
      return;
    }

    try {
      setIsUploading(true);

      // Read the file content
      const fileContent = await file.text();
      
      // Convert YAML to JSON
      const jsonContent = yaml.load(fileContent);

      // Generate UUID for the id
      const recordId = uuidv4();

      // Prepare record for DynamoDB with the correct structure
      const requestBody = {
        id: recordId,
        requestBody: {
          id: recordId,
          name: file.name,
          content: jsonContent,
          createdAt: new Date().toISOString()
        }
      };

      // Save to DynamoDB
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dynamodb/tables/yaml/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save YAML record');
      }

      toast.success('YAML file processed and saved successfully');
      fetchYamlRecords(); // Refresh the records list
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process YAML file');
      console.error('Error processing file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle button click
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Handle record deletion
  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dynamodb/tables/yaml/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          requestBody: { id }
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      toast.success('Record deleted successfully');
      fetchYamlRecords();
    } catch (error) {
      toast.error('Failed to delete record');
      console.error('Error deleting record:', error);
    }
  };

  // View JSON content
  const handleViewContent = (content: any) => {
    // You could implement a modal or dialog to show the content
    console.log(JSON.stringify(content, null, 2));
    // For now, we'll just show it in the console
    toast.info('Content logged to console');
  };

  useEffect(() => {
    fetchYamlRecords();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">YAML Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload YAML files and convert them to JSON
          </p>
        </div>
        
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".yaml,.yml"
            onChange={handleUploadYaml}
            disabled={isUploading}
          />
          <Button
            onClick={handleButtonClick}
            disabled={isUploading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload YAML
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading records...</span>
            </div>
          ) : yamlRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No YAML records found</p>
              <p className="text-sm">Upload a YAML file to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yamlRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-500" />
                        {record.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(record.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewContent(record.content)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YamlPage;