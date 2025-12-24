// EdgeOne Pages 边缘函数：DashScope TTS API 代理
// 用于解决前端直接调用DashScope API时的CORS问题

export default {
  async fetch(request, env, ctx) {
    // 处理OPTIONS预检请求
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

    // 只处理POST请求
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // 获取API密钥 - 从EdgeOne环境变量获取
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

      // 获取请求体
      const requestBody = await request.json();
      console.log('EdgeOne function received request:', requestBody);

      // 构建DashScope API请求
      const dashscopeUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

      const dashscopeResponse = await fetch(dashscopeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-DashScope-SSE': 'disable'
        },
        body: JSON.stringify(requestBody)
      });

      // 获取响应数据
      const responseData = await dashscopeResponse.json();

      // 返回响应，添加CORS头
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
