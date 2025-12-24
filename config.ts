// 应用配置文件
export const config = {
  // DashScope TTS 配置
  dashscope: {
    apiKey: import.meta.env.VITE_DASHSCOPE_API_KEY || '',
    baseUrl: import.meta.env.VITE_DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
    model: 'qwen3-tts-flash'
  },

  // 音色配置
  voices: {
    'zh-CN': 'Cherry', // 中文：樱桃音色，亲切自然
    'en-US': 'Alex'    // 英文：标准英文音色
  },

  // 学习配置
  learning: {
    maxRetryCount: 3,  // 最大重试次数
    skipThreshold: 3,   // 跳过按钮显示阈值
    feedbackDelay: 500, // 反馈延迟时间（毫秒）
    transitionDelay: 2000 // 过渡延迟时间（毫秒）
  },

  // UI配置
  ui: {
    animationDuration: 300, // 动画持续时间（毫秒）
    toastDuration: 3000,    // 提示持续时间（毫秒）
  }
};

export default config;
