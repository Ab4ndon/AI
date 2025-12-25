// DashScope TTS 配置
const DASHSCOPE_API_KEY = import.meta.env.VITE_DASHSCOPE_API_KEY;

const DASHSCOPE_BASE_URL = import.meta.env.DEV
  ? '/api/dashscope/api/v1'  // 开发环境使用代理
  : 'https://dashscope.aliyuncs.com/api/v1'; // 生产环境直接调用

// 根据环境选择不同的API调用方式
const getApiEndpoint = (): string => {
  console.log('TTS Service - Environment check:', {
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD
  });

  if (import.meta.env.DEV) {
    // 开发环境使用Vite代理
    console.log('TTS Service - Using development endpoint');
    return '/api/dashscope/api/v1/services/aigc/multimodal-generation/generation';
  } else {
    // 生产环境 - 优先使用EdgeOne代理
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isEdgeOne = hostname.includes('edgeone.cool') || hostname.includes('edgeone');
    console.log('TTS Service - Hostname check:', { hostname, isEdgeOne, fullUrl: typeof window !== 'undefined' ? window.location.href : 'no-window' });

    // 强制使用EdgeOne代理（因为这是我们的部署环境）
    const endpoint = '/api/dashscope-tts';
    console.log('TTS Service - Using EdgeOne endpoint:', endpoint);
    return endpoint;

    // 保留备用逻辑（暂时注释掉）
    /*
    if (isEdgeOne) {
      // EdgeOne环境使用边缘函数代理
      const endpoint = '/api/dashscope-tts';
      console.log('TTS Service - Using EdgeOne endpoint:', endpoint);
      return endpoint;
    } else {
      // 其他生产环境直接调用DashScope（可能需要后端代理）
      const endpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
      console.log('TTS Service - Using direct DashScope endpoint:', endpoint);
      return endpoint;
    }
    */
  }
};

const API_ENDPOINT = getApiEndpoint();

// 音色配置
const VOICE_CONFIG = {
  'zh-CN': 'Cherry', // 中文音色
  'en-US': 'Alex'    // 英文音色
};

// 使用 DashScope API 进行高质量语音合成
export const speakText = async (text: string, lang: string = 'zh-CN', userInitiated: boolean = false): Promise<void> => {
  console.log('=== SPEAKTEXT START ===');
  console.log('speakText called with:', { text, lang, hasApiKey: !!DASHSCOPE_API_KEY });
  console.log('Current API_ENDPOINT:', API_ENDPOINT);
  console.log('Environment:', { DEV: import.meta.env.DEV, MODE: import.meta.env.MODE });

  if (!DASHSCOPE_API_KEY) {
    console.warn('DashScope API Key not configured');
    throw new Error('AI语音服务未配置，请联系技术支持设置API密钥');
  }

  try {
    const requestBody = {
      model: 'qwen3-tts-flash',
      input: {
        text: text,
        voice: VOICE_CONFIG[lang] || 'Cherry',
        language_type: lang === 'zh-CN' ? 'Chinese' : 'English'
      }
    };

    console.log('DashScope TTS Request:', {
      url: API_ENDPOINT,
      body: requestBody,
      hasApiKey: !!DASHSCOPE_API_KEY,
      environment: import.meta.env.DEV ? 'development' : 'production'
    });

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // 只在直接调用DashScope API时添加Authorization头
    // EdgeOne边缘函数会从环境变量获取API密钥
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    if (!hostname.includes('edgeone.cool')) {
      headers['Authorization'] = `Bearer ${DASHSCOPE_API_KEY}`;
      headers['X-DashScope-SSE'] = 'disable';
    }

    // 调用API（可能是直接调用或通过代理）
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DashScope API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`DashScope API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('DashScope API Success Response:', data);

    // 检查不同的响应格式
    let audioUrl = null;
    if (data.output && data.output.audio_url) {
      audioUrl = data.output.audio_url;
    } else if (data.output && data.output.audio && data.output.audio.url) {
      audioUrl = data.output.audio.url;
    } else if (data.audio_url) {
      audioUrl = data.audio_url;
    }

    if (audioUrl) {
      console.log('Found audio URL:', audioUrl);
      // 创建音频元素并播放
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;

      return new Promise((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = (e) => {
          console.warn('Audio playback failed:', e);
          // 检查是否是用户交互限制导致的失败
          if (e.name === 'NotAllowedError') {
            console.warn('Audio playback blocked by browser autoplay policy');
            console.warn('This is normal - browser requires user interaction before autoplay');
            // 抛出错误，让调用方知道是autoplay被阻止
            reject(new Error('NotAllowedError'));
          } else {
            console.warn('Falling back to Web Speech API due to audio error');
            fallbackToWebSpeech(text, lang);
            resolve();
          }
        };
        audio.play().catch((e) => {
          console.warn('Audio play failed:', e);
          // 检查是否是用户交互限制导致的失败
          if (e.name === 'NotAllowedError') {
            console.warn('Audio playback blocked by browser autoplay policy');
            console.warn('This is normal - browser requires user interaction before autoplay');
            // 抛出错误，让调用方知道是autoplay被阻止
            reject(new Error('NotAllowedError'));
          } else {
            console.warn('Falling back to Web Speech API due to play error');
            fallbackToWebSpeech(text, lang);
            resolve();
          }
        });
      });
    } else {
      console.error('No audio URL found in response:', data);
      throw new Error('No audio URL in response: ' + JSON.stringify(data));
    }
  } catch (error) {
    // 检查是否是用户交互限制导致的失败
    if (error instanceof Error && error.message === 'NotAllowedError') {
      if (userInitiated) {
        // 用户主动点击时，即使autoplay被阻止也降级到Web Speech API
        console.warn('DashScope TTS blocked by autoplay policy, falling back to Web Speech API');
        fallbackToWebSpeech(text, lang);
      } else {
        console.warn('DashScope TTS blocked by autoplay policy, will not fallback to Web Speech API');
        throw error; // 重新抛出，让调用方处理
      }
    } else {
      console.warn('DashScope TTS failed:', error);
      if (userInitiated) {
        // 用户主动点击时，降级到Web Speech API
        console.warn('Falling back to Web Speech API for user-initiated request');
        fallbackToWebSpeech(text, lang);
      } else {
        // 自动播放失败时不降级
        throw new Error('AI语音服务暂时不可用，请稍后重试或联系技术支持');
      }
    }
  }
};

// Web Speech API 作为后备方案
const fallbackToWebSpeech = (text: string, lang: string): void => {
  if ('speechSynthesis' in window) {
    // 停止当前正在播放的语音
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0; // 正常语速，清晰易懂
    utterance.pitch = 1.1; // 稍微高一点，声音更亲切
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('Speech synthesis not supported in this browser');
  }
};

// 简单的语音播放函数，主要用于单词和短句
export const speakSimpleText = async (text: string, lang: string = 'en-US'): Promise<void> => {
  console.log('speakSimpleText called with:', { text, lang });

  // 对于英文单词，直接使用Web Speech API，速度更快
  if (lang === 'en-US' && 'speechSynthesis' in window) {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.8; // 稍慢一些，便于学习
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => {
        console.warn('Simple text speech synthesis failed');
        resolve(); // 即使失败也resolve，避免阻塞
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  // 对于其他情况，使用完整的speakText函数
  return speakText(text, lang, true);
};

// 停止当前播放的语音
export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  // 停止任何正在播放的音频元素
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
};

