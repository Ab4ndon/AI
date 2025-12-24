# CORS问题解决方案

## 问题描述

在开发环境中，前端应用（http://localhost:3000）直接调用DashScope API（https://dashscope.aliyuncs.com）时，会遇到CORS（跨域资源共享）错误：

```
Access to fetch at 'https://dashscope.aliyuncs.com/api/v1/...' from origin 'http://localhost:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 解决方案

### 使用Vite代理服务器

配置Vite的开发服务器代理，将API请求转发到DashScope服务器，从而避免CORS问题。

#### 配置步骤

1. **修改vite.config.ts**：
```typescript
export default defineConfig(({ mode }) => {
  return {
    server: {
      proxy: {
        '/api/dashscope': {
          target: 'https://dashscope.aliyuncs.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/dashscope/, ''),
        }
      }
    },
    // ... 其他配置
  };
});
```

2. **修改API调用URL**：
```typescript
// 开发环境使用代理路径
const BASE_URL = import.meta.env.DEV
  ? '/api/dashscope/api/v1/...'  // 通过代理转发
  : 'https://dashscope.aliyuncs.com/api/v1/...'; // 生产环境直接调用
```

#### 工作原理

- **开发环境**：`http://localhost:3000/api/dashscope/...` → `https://dashscope.aliyuncs.com/...`
- **生产环境**：直接调用 `https://dashscope.aliyuncs.com/...`

### 优势

1. **无缝开发**：开发时无需担心CORS问题
2. **自动切换**：根据环境自动选择调用方式
3. **透明代理**：前端代码无需感知代理的存在
4. **生产就绪**：生产环境直接调用API，无额外开销

### 验证方法

重新启动开发服务器：
```bash
npm run dev
```

检查浏览器控制台，应该不再出现CORS错误，而是看到代理转发的日志信息。

### 注意事项

- 代理配置仅在开发环境中生效
- 生产环境需要确保服务器支持CORS或使用后端代理
- API密钥仍然需要在环境变量中配置
