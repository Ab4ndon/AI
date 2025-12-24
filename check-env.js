#!/usr/bin/env node

/**
 * 检查环境变量配置
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 检查环境变量配置...\n');

const envLocalPath = path.join(__dirname, '.env.local');
const envPath = path.join(__dirname, '.env');

let envFileExists = false;
let envContent = '';

// 检查 .env.local 文件
if (fs.existsSync(envLocalPath)) {
  console.log('✅ 发现 .env.local 文件');
  envContent = fs.readFileSync(envLocalPath, 'utf8');
  envFileExists = true;
} else if (fs.existsSync(envPath)) {
  console.log('✅ 发现 .env 文件');
  envContent = fs.readFileSync(envPath, 'utf8');
  envFileExists = true;
} else {
  console.log('❌ 未找到环境变量文件 (.env 或 .env.local)');
}

// 检查 API Key 配置
if (envFileExists) {
  const hasApiKey = envContent.includes('VITE_DASHSCOPE_API_KEY=') &&
                   !envContent.includes('VITE_DASHSCOPE_API_KEY=your') &&
                   envContent.split('\n').some(line =>
                     line.startsWith('VITE_DASHSCOPE_API_KEY=') &&
                     line.length > 'VITE_DASHSCOPE_API_KEY='.length
                   );

  if (hasApiKey) {
    console.log('✅ DashScope API Key 已配置');

    // 提取 API Key 进行基本验证
    const apiKeyMatch = envContent.match(/VITE_DASHSCOPE_API_KEY=(.+)/);
    if (apiKeyMatch) {
      const apiKey = apiKeyMatch[1].trim();
      if (apiKey.startsWith('sk-') && apiKey.length > 10) {
        console.log('✅ API Key 格式正确');
      } else {
        console.log('⚠️  API Key 格式可能不正确（应以 sk- 开头）');
      }
    }
  } else {
    console.log('❌ DashScope API Key 未配置或格式错误');
    console.log('\n请在 .env.local 文件中添加：');
    console.log('VITE_DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx');
  }
}

console.log('\n💡 获取 API Key：https://help.aliyun.com/zh/model-studio/get-api-key');
console.log('📝 配置完成后，重新启动开发服务器\n');
