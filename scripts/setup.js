#!/usr/bin/env node

/**
 * AI英语老师应用设置脚本
 * 用于检查和配置应用运行所需的环境
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 AI英语老师应用设置脚本');
console.log('================================\n');

// 检查Node.js版本
const nodeVersion = process.version;
console.log(`📋 Node.js版本: ${nodeVersion}`);

// 检查npm版本
try {
  const { execSync } = require('child_process');
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`📋 npm版本: ${npmVersion}`);
} catch (error) {
  console.log('⚠️  无法检测npm版本');
}

// 检查项目文件
console.log('\n📁 检查项目文件...');
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'index.html',
  'src/index.tsx',
  'src/App.tsx'
];

const projectRoot = path.join(__dirname, '..');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
    allFilesExist = false;
  }
});

// 检查环境变量
console.log('\n🔧 检查环境配置...');
const envPath = path.join(projectRoot, '.env');
const envExamplePath = path.join(projectRoot, '.env.example');

if (fs.existsSync(envPath)) {
  console.log('✅ .env 文件存在');
} else {
  console.log('⚠️  .env 文件不存在');

  if (fs.existsSync(envExamplePath)) {
    console.log('💡 发现 .env.example 文件，请复制并配置您的API Key');
  } else {
    console.log('📝 创建 .env.example 模板文件...');
    const envExampleContent = `# DashScope API Configuration
# 获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
VITE_DASHSCOPE_API_KEY=your_dashscope_api_key_here

# 可选：自定义API基础URL
# VITE_DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1
`;

    try {
      fs.writeFileSync(envExamplePath, envExampleContent);
      console.log('✅ 已创建 .env.example 文件');
    } catch (error) {
      console.log('❌ 创建 .env.example 文件失败:', error.message);
    }
  }
}

// 总结
console.log('\n🎯 设置检查完成!');
console.log('\n📋 下一步操作:');
console.log('1. 安装依赖: npm install');
console.log('2. 配置环境变量: 复制 .env.example 为 .env 并填入API Key');
console.log('3. 启动应用: npm run dev');

if (allFilesExist) {
  console.log('\n✅ 项目文件完整，可以开始开发!');
} else {
  console.log('\n⚠️  部分文件缺失，请检查项目结构');
}

console.log('\n🎉 祝您开发愉快!\n');
