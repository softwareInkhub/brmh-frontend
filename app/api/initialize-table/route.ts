import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { namespaceName, accountName, methodName } = body;

    if (!namespaceName || !accountName || !methodName) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'namespaceName, accountName, and methodName are required'
      }, { status: 400 });
    }

    // Create table name by combining namespace, account and method names
    const tableName = `${namespaceName}_${accountName}_${methodName}`.replace(/\s+/g, '_').toLowerCase();

    // Prepare the table creation data to match your DynamoDB API requirements
    const tableData = {
      name: tableName, // Changed from TableName to name
      partitionKey: {
        name: "id",
        type: "String"
      },
      sortKey: null,
      useProvisioned: false
    };

    console.log('Creating DynamoDB table with data:', JSON.stringify(tableData, null, 2));

    try {
      // Make request to create DynamoDB table
      const response = await fetch(`${process.env.NEXT_PUBLIC_AWS_URL}/api/dynamodb/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableData),
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        return NextResponse.json({
          error: 'Invalid response from DynamoDB API',
          message: 'Received non-JSON response from server',
          details: responseText.substring(0, 200) // Include first 200 chars of response for debugging
        }, { status: 500 });
      }

      if (!response.ok) {
        console.error('Error response from DynamoDB API:', result);
        return NextResponse.json({
          error: 'DynamoDB API error',
          message: result.message || 'Failed to create table',
          details: result
        }, { status: response.status });
      }

      console.log('Table creation successful:', result);
      
      return NextResponse.json({
        message: 'Table initialized successfully',
        tableName,
        ...result
      }, { status: 201 });

    } catch (fetchError) {
      console.error('Network error:', fetchError);
      return NextResponse.json({
        error: 'Network error',
        message: 'Failed to connect to DynamoDB API',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Error initializing table:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize table', 
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error 
    }, { status: 500 });
  }
} 