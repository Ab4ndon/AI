// 语音识别服务，使用 Web Speech API
export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isSupported: boolean = false;

  constructor() {
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognition;

    if (this.isSupported) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true; // 持续识别，直到用户停止
        this.recognition.interimResults = true; // 返回临时结果（用于实时显示）
        this.recognition.lang = 'en-US'; // 英语
        this.recognition.maxAlternatives = 1; // 最多返回1个备选结果
      } catch (error) {
        console.error('Failed to initialize speech recognition:', error);
        this.isSupported = false;
        return;
      }
    }
  }

  // 检查是否支持语音识别
  checkSupport(): boolean {
    return this.isSupported;
  }

  // 开始语音识别
  start(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (error: string) => void,
    onEnd?: () => void
  ): void {
    if (!this.isSupported || !this.recognition) {
      onError?.('Speech recognition is not supported in this browser');
      return;
    }

    // 清除之前的事件监听器
    this.recognition.onresult = (event: any) => {
      // 获取所有识别结果
      let allFinalTranscript = ''; // 所有最终结果
      let lastInterimTranscript = ''; // 最后一个临时结果
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        
        if (result.isFinal) {
          // 最终结果：累积所有最终结果
          if (allFinalTranscript) {
            allFinalTranscript += ' ' + transcript;
          } else {
            allFinalTranscript = transcript;
          }
        } else {
          // 临时结果：只保存最后一个
          lastInterimTranscript = transcript;
        }
      }
      
      // 优先使用累积的最终结果，如果有临时结果则追加显示
      const finalText = allFinalTranscript || '';
      const displayText = finalText ? (finalText + ' ' + lastInterimTranscript).trim() : lastInterimTranscript;
      
      const lastResult = event.results[event.results.length - 1];
      const confidence = lastResult[0].confidence || 0.5;
      const isFinal = lastResult.isFinal;

      onResult({
        transcript: displayText.toLowerCase(),
        confidence,
        isFinal
      });
    };

    this.recognition.onerror = (event: any) => {
      let errorMessage = 'Speech recognition error';
      if (event.error === 'no-speech') {
        errorMessage = 'No speech detected. Please try again.';
      } else if (event.error === 'audio-capture') {
        errorMessage = 'No microphone found. Please check your microphone.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone permission denied. Please allow microphone access.';
      }
      onError?.(errorMessage);
    };

    this.recognition.onend = () => {
      onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (error) {
      onError?.('Failed to start speech recognition');
    }
  }

  // 停止语音识别
  stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        // 忽略停止时的错误
      }
    }
  }

  // 中止语音识别
  abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (error) {
        // 忽略中止时的错误
      }
    }
  }
}

