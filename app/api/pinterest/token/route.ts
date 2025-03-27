import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, clientId, clientSecret, redirectUrl } = await request.json();

    if (!code || !clientId || !clientSecret || !redirectUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Pinterest OAuth token endpoint
    const tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUrl
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to fetch Pinterest token', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data.access_token);
  } catch (error) {
    console.error('Error in Pinterest token endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 