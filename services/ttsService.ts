// DashScope TTS 配置
const DASHSCOPE_API_KEY = import.meta.env.VITE_DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL = import.meta.env.DEV
  ? '/api/dashscope/api/v1'  // 开发环境使用代理
  : '/api/dashscope-tts'; // 生产环境使用EdgeOne函数代理

// 音色配置
const VOICE_CONFIG = {
  'zh-CN': 'Cherry', // 中文音色
  'en-US': 'Alex'    // 英文音色
};

// 使用 DashScope API 进行高质量语音合成
export const speakText = async (text: string, lang: string = 'zh-CN', userInitiated: boolean = false): Promise<void> => {
  console.log('speakText called with:', { text, lang, hasApiKey: !!DASHSCOPE_API_KEY });

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
      url: `${DASHSCOPE_BASE_URL}/services/aigc/multimodal/generation`,
      body: requestBody,
      hasApiKey: !!DASHSCOPE_API_KEY
    });

    // 使用正确的TTS endpoint
    const response = await fetch(`${DASHSCOPE_BASE_URL}/services/aigc/multimodal-generation/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'X-DashScope-SSE': 'disable'
      },
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

