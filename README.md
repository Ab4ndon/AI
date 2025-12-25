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
