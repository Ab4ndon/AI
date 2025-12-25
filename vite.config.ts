import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // 配置代理服务器解决CORS问题
        proxy: {
          '/api/dashscope': {
            target: 'https://dashscope.aliyuncs.com',
            changeOrigin: true,
            rewrite: (path) => {
              if (path.includes('/api/v1')) {
                // 语音合成等已经有完整路径的，直接替换前缀
                return path.replace(/^\/api\/dashscope/, '');
              } else {
                // 文本生成等需要添加api/v1的，替换为完整路径
                return path.replace(/^\/api\/dashscope/, '/api/v1');
              }
            },
            configure: (proxy, options) => {
              proxy.on('error', (err, req, res) => {
                console.log('proxy error', err);
              });
              proxy.on('proxyReq', (proxyReq, req, res) => {
                console.log('Sending Request to the Target:', req.method, req.url);
                // 添加Authorization头
                const apiKey = env.VITE_DASHSCOPE_API_KEY || env.DASHSCOPE_API_KEY;
                if (apiKey) {
                  proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
                  proxyReq.setHeader('X-DashScope-SSE', 'disable');
                  console.log('Added Authorization header for request');
                } else {
                  console.log('No API key found in environment variables');
                }
              });
              proxy.on('proxyRes', (proxyRes, req, res) => {
                console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
              });
            },
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.DASHSCOPE_API_KEY': JSON.stringify(env.VITE_DASHSCOPE_API_KEY || env.DASHSCOPE_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
