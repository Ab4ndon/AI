// DashScope TTS 测试脚本
// 用于验证 API 配置是否正确

// @ts-ignore
const DASHSCOPE_API_KEY = (import.meta as any).env?.VITE_DASHSCOPE_API_KEY;
// @ts-ignore
const DASHSCOPE_BASE_URL = (import.meta as any).env?.DEV
  ? '/api/dashscope/api/v1'  // 开发环境使用代理
  : 'https://dashscope.aliyuncs.com/api/v1'; // 生产环境直接调用

export const testDashScopeConnection = async (): Promise<boolean> => {
  console.log('Testing DashScope TTS connection...');
  console.log('API Key configured:', !!DASHSCOPE_API_KEY);
  console.log('Base URL:', DASHSCOPE_BASE_URL);

  if (!DASHSCOPE_API_KEY) {
    console.warn('❌ DashScope API Key not configured');
    return false;
  }

  try {
    const requestBody = {
      model: 'qwen3-tts-flash',
      input: {
        text: 'Hello world',
        voice: 'Cherry',
        language_type: 'English'
      }
    };

    console.log('Sending request:', requestBody);

    const response = await fetch(`${DASHSCOPE_BASE_URL}/services/aigc/text2speech/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ API Response received:', data);
        if (data.output && data.output.audio_url) {
          console.log('✅ DashScope TTS connection successful');
          console.log('Audio URL:', data.output.audio_url);
          return true;
        } else if (data.output) {
          console.log('⚠️ Response format different, checking for audio data...');
          console.log('Output object:', data.output);
        } else {
          console.log('❌ Unexpected response format:', data);
        }
      } catch (parseError) {
        console.log('❌ Failed to parse response as JSON:', parseError);
        console.log('Raw response:', responseText);
      }
    } else {
      console.error('❌ DashScope TTS test failed:', response.status, response.statusText);
      console.error('Response body:', responseText);
      console.error('Request headers sent:', {
        'Authorization': !!DASHSCOPE_API_KEY,
        'Content-Type': 'application/json'
      });
    }

    return false;
  } catch (error) {
    console.error('❌ DashScope TTS connection error:', error);
    return false;
  }
};

// 在开发环境中运行测试
if (import.meta.env.DEV) {
  // 可以在这里调用测试函数
  console.log('DashScope TTS Test available. Call testDashScopeConnection() to test.');
}

