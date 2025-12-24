#!/usr/bin/env node

/**
 * DashScope API 诊断脚本
 * 用于检查API Key和连接问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DashScope API 诊断工具');
console.log('==========================\n');

// 1. 检查环境变量文件
console.log('1️⃣ 检查环境变量配置...');
const envLocalPath = path.join(__dirname, '.env.local');
const envPath = path.join(__dirname, '.env');

let apiKey = null;

if (fs.existsSync(envLocalPath)) {
  console.log('✅ 发现 .env.local 文件');
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const match = envContent.match(/VITE_DASHSCOPE_API_KEY=(.+)/);
  if (match) {
    apiKey = match[1].trim();
    console.log('✅ 找到 API Key 配置');
    console.log(`📝 API Key 前缀: ${apiKey.substring(0, 10)}...`);
  } else {
    console.log('❌ .env.local 文件中未找到 VITE_DASHSCOPE_API_KEY');
  }
} else if (fs.existsSync(envPath)) {
  console.log('✅ 发现 .env 文件');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/VITE_DASHSCOPE_API_KEY=(.+)/);
  if (match) {
    apiKey = match[1].trim();
    console.log('✅ 找到 API Key 配置');
    console.log(`📝 API Key 前缀: ${apiKey.substring(0, 10)}...`);
  } else {
    console.log('❌ .env 文件中未找到 VITE_DASHSCOPE_API_KEY');
  }
} else {
  console.log('❌ 未找到环境变量文件 (.env 或 .env.local)');
  console.log('\n请创建 .env.local 文件并添加：');
  console.log('VITE_DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx');
}

// 2. 基本API Key验证
console.log('\n2️⃣ API Key 格式验证...');
if (apiKey) {
  if (apiKey.startsWith('sk-') && apiKey.length > 20) {
    console.log('✅ API Key 格式正确');
  } else {
    console.log('⚠️ API Key 格式可能不正确（应以 sk- 开头）');
  }
} else {
  console.log('❌ 无法验证 API Key');
}

// 3. 网络连接测试
console.log('\n3️⃣ 网络连接测试...');
const https = require('https');

const testConnection = () => {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'dashscope.aliyuncs.com',
      port: 443,
      path: '/api/v1/services/aigc/text2speech/generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey ? `Bearer ${apiKey}` : 'Bearer test'
      }
    }, (res) => {
      console.log(`📡 HTTP 状态码: ${res.statusCode}`);
      if (res.statusCode === 200 || res.statusCode === 400) {
        console.log('✅ 网络连接正常');
      } else {
        console.log(`⚠️ 意外的状态码: ${res.statusCode}`);
      }
      resolve();
    });

    req.on('error', (err) => {
      console.log('❌ 网络连接失败:', err.message);
      resolve();
    });

    // 发送一个简单的测试请求
    req.write(JSON.stringify({
      model: 'qwen3-tts-flash',
      input: {
        text: 'Hello',
        voice: 'Cherry',
        language_type: 'English'
      }
    }));
    req.end();
  });
};

// 运行测试
testConnection().then(() => {
  console.log('\n🎯 诊断完成！');
  console.log('\n💡 建议检查:');
  console.log('1. API Key 是否有效且有余额');
  console.log('2. 网络是否能访问 dashscope.aliyuncs.com');
  console.log('3. API Key 是否有TTS权限');
  console.log('4. 尝试在浏览器中直接测试API调用');

  console.log('\n🔗 相关链接:');
  console.log('- DashScope控制台: https://help.aliyun.com/zh/model-studio/get-api-key');
  console.log('- API文档: https://help.aliyun.com/zh/model-studio/developer-reference/tts-api');
});
