<div align="center">
<img width="1200" height="475" alt="AI English Teacher Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🤖 AI English Teacher - 智能英语学习应用

一个基于AI的英语学习应用，集成了语音识别、AI教师评价、语音合成等先进技术，为用户提供个性化的英语学习体验。

## ✨ 核心功能

- 🎤 **智能语音识别**: 实时语音识别用户发音
- 🧠 **AI教师评价**: 基于Qwen模型的个性化学习反馈
- 🔊 **高质量语音合成**: DashScope TTS提供自然语音指导
- 📊 **学习进度追踪**: 详细的学习报告和数据分析
- 🎯 **游戏化学习**: 互动练习提升学习兴趣
- 🌐 **多环境部署**: 支持本地开发和云端部署

## 🛠️ 技术栈

### 前端技术栈
- **React 19.2.3** - 现代React框架
- **TypeScript 5.8.2** - 类型安全的JavaScript
- **Vite 6.2.0** - 快速的构建工具
- **Tailwind CSS** - 原子化CSS框架
- **Lucide React** - 精美图标库

### AI & 语音技术栈
- **阿里云DashScope** - 大语言模型和语音服务
  - Qwen-turbo - 文本生成和AI评价
  - qwen3-tts-flash - 高质量语音合成
- **Web Speech API** - 浏览器原生语音识别
- **Web Audio API** - 音频处理和格式转换

### 后端 & 部署
- **腾讯云EdgeOne** - 全球CDN和边缘计算
- **Netlify Functions** - Serverless函数（备选）
- **Docker** - 容器化部署支持

## 🚀 快速开始

### 系统要求

- **Node.js** >= 18.0.0
- **npm** 或 **yarn** 包管理器
- **现代浏览器** (Chrome 88+, Firefox 85+, Safari 14+, Edge 88+)

### 1. 克隆项目

```bash
git clone https://github.com/Ab4ndon/AI.git
cd AI
```

### 2. 安装依赖

```bash
npm install
```

### 3. ⚠️ 重要：配置API Key

**本应用的核心功能依赖DashScope API Key，请务必正确配置！**

#### 获取API Key
访问 [阿里云DashScope控制台](https://help.aliyun.com/zh/model-studio/get-api-key) 获取API Key

#### 配置环境变量
在项目根目录创建 `.env.local` 文件：

```bash
# DashScope API配置 - 必须配置，否则AI评价和语音功能将无法使用
VITE_DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxx

# 注意：
# 1. 替换为您的真实API Key（以sk-开头）
# 2. 不要将此文件提交到版本控制系统
# 3. API Key泄露可能导致费用损失，请妥善保管
```

#### 验证配置

运行环境检查脚本：

```bash
# 检查API Key配置是否正确
node check-env.js

# 测试API连接（可选）
npm run test:tts
```

### 4. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

## 🎯 使用指南

### 学习流程
1. **单词巩固** - 看图识词 + 语音练习
2. **句型巩固** - 句子朗读 + 专项练习
3. **课文朗读** - 分段阅读 + 理解测试
4. **学习报告** - 查看学习成果和建议

### 语音功能说明

- **AI教师语音**: 使用Cherry音色提供中文指导
- **发音示范**: 使用Alex音色展示标准英文发音
- **自动降级**: API不可用时使用浏览器内置语音
- **实时反馈**: 练习时提供即时语音评价

## 🌐 部署方式

### 方式一：腾讯云EdgeOne（推荐）

**适合生产环境，提供全球CDN加速**

#### 部署步骤

1. **登录腾讯云控制台**
   - 访问 [EdgeOne控制台](https://console.cloud.tencent.com/edgeone)
   - 创建新应用，选择"Pages"部署方式

2. **连接代码仓库**
   - GitHub仓库: `https://github.com/Ab4ndon/AI.git`
   - 自动识别部署配置

3. **⚠️ 配置环境变量（重要！）**
   ```bash
   # 前端环境变量
   VITE_DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxx

   # 边缘函数环境变量
   DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxx
   ```
   **注意**: 必须同时配置两个变量，前端和边缘函数各用一个

4. **部署应用**
   - EdgeOne自动构建和部署
   - 获得 `https://xxx.edgeone.cool` 域名

#### EdgeOne优势
- ✅ 全球CDN加速，提升访问速度
- ✅ 边缘函数自动解决CORS问题
- ✅ 免费HTTPS证书
- ✅ GitHub集成，自动重新部署

### 方式二：Netlify部署

```bash
# 构建生产版本
npm run build

# 部署到Netlify
# 在Netlify控制台导入构建好的dist目录
# 配置环境变量：VITE_DASHSCOPE_API_KEY
```

### 方式三：Docker部署

```bash
# 构建Docker镜像
npm run deploy:docker

# 或使用docker-compose
docker-compose up -d
```

## 🔧 故障排除

### API相关问题

**401 Unauthorized**
```
原因：API Key未配置或无效
解决：检查.env.local文件，确保API Key正确
```

**400 Bad Request**
```
原因：API参数错误
解决：检查API Key格式（应以sk-开头）
```

**CORS错误**
```
原因：跨域请求被阻止
解决：开发环境已自动配置代理；生产环境使用EdgeOne
```

### 语音功能问题

**无声音输出**
```bash
# 检查API配置
node check-env.js

# 测试语音服务
npm run test:tts
```

**浏览器兼容性**
- Chrome/Edge: 完全支持
- Firefox/Safari: 部分功能支持
- 移动端: 建议使用Chrome

### 部署问题

**EdgeOne部署失败**
- 检查环境变量配置
- 查看EdgeOne控制台日志
- 确认GitHub仓库权限

**构建失败**
```bash
# 清理缓存重新构建
npm run clean
npm install
npm run build
```

## 📚 项目结构

```
├── components/          # React组件
│   ├── AudioButton.tsx     # 录音按钮组件
│   ├── AudioPlayback.tsx   # 音频播放组件
│   ├── SpeechBubble.tsx    # 对话气泡
│   └── TeacherAvatar.tsx   # 教师头像
├── services/           # 业务服务层
│   ├── qwenService.ts      # AI评价服务
│   ├── ttsService.ts       # 语音合成服务
│   ├── speechRecognitionService.ts  # 语音识别
│   └── soundEffectService.ts        # 音效服务
├── views/              # 页面视图
│   ├── Home.tsx           # 首页
│   ├── WordConsolidation.tsx    # 单词巩固
│   ├── SentenceConsolidation.tsx # 句子巩固
│   └── Report.tsx         # 学习报告
├── edge-functions/     # 腾讯云边缘函数
├── functions/          # Netlify函数
└── scripts/            # 部署和工具脚本
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

**重要提醒**: 请确保妥善保管您的DashScope API Key，避免泄露导致不必要的费用损失。如有任何技术问题，请查看故障排除部分或提交Issue。
