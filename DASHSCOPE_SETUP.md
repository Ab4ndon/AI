# DashScope TTS 集成设置

## 配置步骤

### 1. 获取 API Key
访问 [DashScope 控制台](https://help.aliyun.com/zh/model-studio/get-api-key) 获取 API Key

### 2. 环境变量配置
在项目根目录创建 `.env` 文件：

```bash
# DashScope API Configuration
VITE_DASHSCOPE_API_KEY=your_actual_api_key_here
```

### 3. 安装依赖（如果需要）
当前实现使用原生 fetch API，不需要额外安装依赖。

## 功能特性

### 高质量语音合成
- 使用 `qwen3-tts-flash` 模型
- 支持多种音色：
  - 中文：Cherry（樱桃音色）
  - 英文：Alex（标准英文）
- 自动语言检测和语调优化

### 流畅的后备机制
- 优先使用 DashScope 高质量语音
- 失败时自动降级到浏览器 Web Speech API
- 确保在任何环境下都有语音功能

### 使用示例

```typescript
import { speakText } from './services/ttsService';

// 中文语音
await speakText('你好，欢迎学习英语！', 'zh-CN');

// 英文语音
await speakText('Hello, welcome to English learning!', 'en-US');
```

## 注意事项

1. **API Key 安全**：确保不要将真实 API Key 提交到版本控制系统
2. **网络要求**：需要互联网连接访问 DashScope 服务
3. **浏览器兼容性**：现代浏览器支持 fetch API
4. **音频播放**：确保浏览器允许自动播放音频

## 故障排除

如果语音不工作：
1. 检查 API Key 是否正确配置
2. 确认网络连接正常
3. 查看浏览器控制台错误信息
4. 系统会自动降级到 Web Speech API

