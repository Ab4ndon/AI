// EdgeOne Pages Functions: DashScope TTS API Proxy
// Solves CORS issues when calling DashScope API from frontend

export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      message: `HTTP method ${request.method} is not allowed. Only POST requests are supported.`
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    console.log('EdgeOne function called with method:', request.method);
    console.log('EdgeOne function URL:', request.url);

    // Get API key from EdgeOne environment variables
    const apiKey = env.DASHSCOPE_API_KEY;
    console.log('EdgeOne API key configured:', !!apiKey, 'Key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'null');

    if (!apiKey) {
      console.error('DASHSCOPE_API_KEY not configured in EdgeOne environment');
      console.error('Please set DASHSCOPE_API_KEY in EdgeOne console environment variables');
      console.error('Both VITE_DASHSCOPE_API_KEY and DASHSCOPE_API_KEY need to be set');
      return new Response(JSON.stringify({
        error: 'API key not configured',
        details: 'Please set DASHSCOPE_API_KEY in EdgeOne environment variables. Make sure to set both VITE_DASHSCOPE_API_KEY and DASHSCOPE_API_KEY in EdgeOne console.'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Get request body
    const requestBody = await request.json();
    console.log('EdgeOne function received request:', requestBody);

    // Determine API endpoint based on request content
    let dashscopeUrl;

    // Check if it's a TTS request (has input.text and input.voice)
    if (requestBody.input && requestBody.input.text && requestBody.input.voice) {
      dashscopeUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
    }
    // Check if it's a text generation request (has messages array)
    else if (requestBody.messages && Array.isArray(requestBody.messages)) {
      dashscopeUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    }
    // Default fallback
    else {
      dashscopeUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    }

    console.log('Using DashScope URL:', dashscopeUrl);

    // Call DashScope API
    const dashscopeResponse = await fetch(dashscopeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify(requestBody)
    });

    // Get response data
    const responseData = await dashscopeResponse.json();

    // Return response with CORS headers
    return new Response(JSON.stringify(responseData), {
      status: dashscopeResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    console.error('EdgeOne function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
}