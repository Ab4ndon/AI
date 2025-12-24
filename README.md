<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/17SBNHprxzizMO8eSZUt_UQX0KhbC0k-e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure DashScope API (推荐，用于高质量语音合成):
   - 获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
   - 在项目根目录创建 `.env` 文件：
     ```
     VITE_DASHSCOPE_API_KEY=your_actual_api_key_here
     ```
   - 如果不配置API Key，系统会自动使用浏览器内置的语音合成

3. Run the app:
   `npm run dev`

## 语音功能说明

本应用集成了DashScope的高质量TTS服务，提供更自然、专业的语音体验：

- **中文语音**：使用Cherry音色，亲切自然
- **英文语音**：使用Alex音色，标准发音
- **自动降级**：API不可用时自动使用浏览器Web Speech API
- **实时反馈**：发音练习时提供即时语音指导

### CORS解决方案

开发环境中可能遇到CORS错误，应用已配置Vite代理服务器自动解决此问题。

### 语音功能诊断

如果遇到语音功能问题，请按以下步骤诊断：

1. **检查API Key配置**：
   ```bash
   node debug-api.js
   ```

2. **测试API连接**：
   ```bash
   # 在浏览器控制台中运行
   import('./services/dashscopeTest.ts').then(m => m.testDashScopeConnection())
   ```

3. **常见问题**：
   - **400错误**：API Key无效或参数格式错误
   - **CORS错误**：代理配置问题（已自动解决）
   - **403错误**：API Key权限不足

如需测试语音功能，请确保配置了有效的DashScope API Key。

## 部署到EdgeOne

本项目支持一键部署到腾讯云EdgeOne，提供全球CDN加速和边缘计算服务。

### 部署步骤

1. **登录腾讯云控制台**：
   - 访问 [EdgeOne控制台](https://console.cloud.tencent.com/edgeone)

2. **创建应用**：
   - 点击"创建应用"
   - 选择"Pages"部署方式
   - 连接GitHub仓库：`https://github.com/Ab4ndon/AI.git`

3. **配置环境变量**：
   - 在EdgeOne控制台的环境变量设置中添加：
     ```
     VITE_DASHSCOPE_API_KEY=your_dashscope_api_key_here
     DASHSCOPE_API_KEY=your_dashscope_api_key_here
     ```
   - **重要**：必须设置 `DASHSCOPE_API_KEY`（无VITE_前缀），这是边缘函数使用的变量
   - `VITE_DASHSCOPE_API_KEY` 用于前端代码

4. **配置边缘函数**：
   - EdgeOne会自动识别 `edge-functions/` 目录中的函数
   - 边缘函数用于代理DashScope API请求，解决CORS问题

5. **部署应用**：
   - 保存配置后，EdgeOne会自动构建和部署
   - 部署完成后获得类似 `https://xxx.edgeone.cool` 的域名

### EdgeOne特性

- ✅ **全球CDN加速**：就近访问，提升用户体验
- ✅ **边缘函数代理**：自动解决CORS跨域问题
- ✅ **自动HTTPS**：免费SSL证书
- ✅ **GitHub集成**：代码变更自动触发重新部署

### 故障排除

如果部署后语音功能仍然不工作：

1. **检查环境变量**：确保两个API Key都已正确配置
2. **查看函数日志**：在EdgeOne控制台查看边缘函数运行日志
3. **检查网络连接**：确认EdgeOne能够访问DashScope API

EdgeOne部署完成后，应用将获得更好的性能和稳定性！