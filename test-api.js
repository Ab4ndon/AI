// 测试EdgeOne API端点
// 用于验证/api/dashscope-tts是否正常工作

const API_URL = 'https://myenglishai-i8fyjly4.edgeone.cool/api/dashscope-tts';

async function testAPI() {
  console.log('🧪 测试EdgeOne API端点...');
  console.log('📡 请求URL:', API_URL);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen3-tts-flash',
        input: {
          text: 'Hello, this is a test.',
          voice: 'Cherry'
        }
      })
    });

    console.log('📊 响应状态:', response.status);
    console.log('📋 响应头:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📄 响应内容:', responseText.substring(0, 200) + '...');

    if (response.ok) {
      console.log('✅ API调用成功！');
    } else {
      console.log('❌ API调用失败');
    }
  } catch (error) {
    console.error('💥 请求错误:', error.message);
  }
}

// 运行测试
testAPI();
