// 音频格式转换服务，将 webm 等格式转换为 wav
export class AudioConverterService {
  // 将音频 Blob 转换为 WAV 格式（更兼容）
  static async convertToWav(audioBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // 创建 AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        try {
          // 解码音频数据
          const audioBuffer = await audioContext.decodeAudioData(e.target?.result as ArrayBuffer);
          
          // 转换为 WAV
          const wavBlob = this.audioBufferToWav(audioBuffer);
          resolve(wavBlob);
        } catch (error) {
          console.error('Error converting audio:', error);
          // 如果转换失败，返回原始 Blob
          resolve(audioBlob);
        }
      };

      fileReader.onerror = () => {
        reject(new Error('Failed to read audio file'));
      };

      fileReader.readAsArrayBuffer(audioBlob);
    });
  }

  // 将 AudioBuffer 转换为 WAV Blob
  private static audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let sample: number;
    let offset = 0;
    let pos = 0;

    // 写入 WAV 文件头
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // WAV 文件头
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // 文件长度 - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // 子块大小
    setUint16(1); // 音频格式 (PCM)
    setUint16(numOfChan); // 声道数
    setUint32(buffer.sampleRate); // 采样率
    setUint32(buffer.sampleRate * 2 * numOfChan); // 字节率
    setUint16(numOfChan * 2); // 块对齐
    setUint16(16); // 位深度
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // 数据长度

    // 写入音频数据
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // 检查浏览器是否支持音频转换
  static isSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }
}

