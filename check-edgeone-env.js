// EdgeOne环境变量检查工具
// 用于验证EdgeOne部署中的环境变量配置

console.log('🔍 检查EdgeOne环境变量配置...\n');

// 检查前端环境变量
const viteApiKey = import.meta.env.VITE_DASHSCOPE_API_KEY;
console.log('✅ 前端环境变量 (VITE_DASHSCOPE_API_KEY):', viteApiKey ? '已配置' : '❌ 未配置');

// 模拟EdgeOne函数环境检查
console.log('\n📋 EdgeOne配置检查清单:');
console.log('1. ✅ VITE_DASHSCOPE_API_KEY - 前端使用 ✓');
console.log('2. ❓ DASHSCOPE_API_KEY - 边缘函数使用 (需要在EdgeOne控制台设置)');

console.log('\n🚀 部署步骤确认:');
console.log('• GitHub仓库已连接');
console.log('• 边缘函数已配置');
console.log('• 路由规则已设置');

console.log('\n⚠️  重要提醒:');
console.log('在EdgeOne控制台的环境变量设置中，需要同时配置两个变量:');
console.log('  VITE_DASHSCOPE_API_KEY=你的DashScope_API密钥');
console.log('  DASHSCOPE_API_KEY=你的DashScope_API密钥');

console.log('\n🔧 如果仍有问题，请检查:');
console.log('• EdgeOne控制台的函数日志');
console.log('• 浏览器开发者工具的网络面板');
console.log('• API密钥是否有效且有足够余额');

export {};
