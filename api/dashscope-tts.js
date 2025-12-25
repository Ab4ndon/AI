// EdgeOne Pages Functions: Universal DashScope API Proxy
// Handles TTS, text generation, and other DashScope API calls
// Solves CORS issues when calling DashScope API from frontend

export default {
  async fetch(request, env, ctx) {
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
      // Get API key from EdgeOne environment variables
      const apiKey = env.DASHSCOPE_API_KEY;
      if (!apiKey) {
        console.error('DASHSCOPE_API_KEY not configured in EdgeOne environment');
        return new Response(JSON.stringify({
          error: 'API key not configured',
          details: 'Please set DASHSCOPE_API_KEY in EdgeOne environment variables'
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
};
