// 音频录制服务，使用 MediaRecorder API
export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private volumeCallback: ((volume: number) => void) | null = null;

  // 开始录音
  async startRecording(): Promise<void> {
    try {
      // 获取麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // 设置音频分析器用于音量检测
      this.setupAudioAnalysis();

      // 创建 MediaRecorder
      this.audioChunks = [];
      
      // 检测浏览器支持的音频格式
      // 优先选择更兼容的格式
      let mimeType = '';
      const types = [
        'audio/webm;codecs=opus',  // Chrome, Edge
        'audio/webm',              // 通用 webm
        'audio/ogg;codecs=opus',   // Firefox
        'audio/mp4',                // Safari
        'audio/wav'                 // 最兼容但文件较大
      ];
      
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('Using audio format:', mimeType);
          break;
        }
      }
      
      // 如果没有找到支持的格式，使用默认值
      if (!mimeType) {
        mimeType = 'audio/webm';
        console.warn('No supported format found, using default:', mimeType);
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType
      });

      // 收集音频数据
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log('Audio chunk received:', event.data.size, 'bytes');
        }
      };

      // 开始录音
      // 使用 timeslice 参数确保数据被定期收集
      this.mediaRecorder.start(100); // 每100ms收集一次数据
      
      console.log('Recording started with format:', this.mediaRecorder.mimeType);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('无法访问麦克风，请检查权限设置');
    }
  }

  // 设置音频分析器用于音量检测
  private setupAudioAnalysis(): void {
    if (!this.stream) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);

      this.analyser.fftSize = 256;
      this.microphone.connect(this.analyser);

      // 开始音量监测
      this.monitorVolume();
    } catch (error) {
      console.warn('Failed to setup audio analysis:', error);
    }
  }

  // 监测音量
  private monitorVolume(): void {
    if (!this.analyser || !this.volumeCallback) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!this.analyser || !this.volumeCallback) return;

      this.analyser.getByteFrequencyData(dataArray);

      // 计算平均音量
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // 归一化到0-1范围
      const volume = Math.min(average / 128, 1);

      this.volumeCallback!(volume);

      // 继续监测
      if (this.audioContext && this.audioContext.state === 'running') {
        requestAnimationFrame(checkVolume);
      }
    };

    checkVolume();
  }

  // 设置音量回调
  setVolumeCallback(callback: (volume: number) => void): void {
    this.volumeCallback = callback;
  }

  // 停止录音并返回音频 Blob
  async stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        console.warn('MediaRecorder is not recording');
        resolve(null);
        return;
      }

      // 确保在停止前请求所有剩余数据
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.requestData(); // 请求所有缓冲的数据
      }

      this.mediaRecorder.onstop = () => {
        // 创建音频 Blob（使用实际使用的格式）
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        
        if (this.audioChunks.length === 0) {
          console.warn('No audio chunks recorded');
          resolve(null);
          return;
        }
        
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        
        console.log('Audio recorded:', {
          size: audioBlob.size,
          type: mimeType,
          chunks: this.audioChunks.length,
          totalChunksSize: this.audioChunks.reduce((sum, chunk) => sum + chunk.size, 0)
        });
        
        // 验证 Blob 是否有效
        if (audioBlob.size === 0) {
          console.error('Recorded audio blob is empty');
          resolve(null);
          return;
        }
        
        const chunks = [...this.audioChunks]; // 保存副本用于调试
        this.audioChunks = [];
        
        // 停止所有音频轨道
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }

        // 清理音频分析器
        this.cleanupAudioAnalysis();

        resolve(audioBlob);
      };

      // 停止录音
      try {
        this.mediaRecorder.stop();
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
        resolve(null);
      }
    });
  }

  // 中止录音（不保存）
  abortRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.audioChunks = [];

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // 清理音频分析器
    this.cleanupAudioAnalysis();
  }

  // 清理音频分析器
  private cleanupAudioAnalysis(): void {
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.warn);
      this.audioContext = null;
    }
    this.volumeCallback = null;
  }

  // 检查是否支持录音
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && MediaRecorder);
  }
}

