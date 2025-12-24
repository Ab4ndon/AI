#!/bin/bash

# AI英语老师应用部署脚本
# 用于生产环境部署

set -e

echo "🚀 开始部署AI英语老师应用..."

# 检查环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 检查环境变量
if [ -z "$VITE_DASHSCOPE_API_KEY" ]; then
    echo "⚠️  警告: 未设置 VITE_DASHSCOPE_API_KEY 环境变量"
    echo "   应用将使用浏览器内置语音合成"
fi

# 安装依赖
echo "📦 安装项目依赖..."
npm ci

# 构建应用
echo "🔨 构建应用..."
npm run build

# 检查构建结果
if [ ! -d "dist" ]; then
    echo "❌ 构建失败，未找到dist目录"
    exit 1
fi

echo "✅ 构建完成！"

# 可选：运行测试
if [ "$1" = "--test" ]; then
    echo "🧪 运行测试..."
    npm test
fi

# 可选：使用Docker部署
if [ "$1" = "--docker" ]; then
    echo "🐳 使用Docker部署..."
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d --build
        echo "✅ Docker部署完成"
        echo "   应用运行在: http://localhost"
    else
        echo "❌ Docker未安装，请手动部署"
    fi
    exit 0
fi

# 预览构建结果
echo "🌐 启动预览服务器..."
echo "   应用将在 http://localhost:4173 启动"
echo "   按 Ctrl+C 停止服务器"
npm run preview
