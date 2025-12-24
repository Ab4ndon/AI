// 简单的音效播放服务
export const playSoundEffect = (soundType: 'correct' | 'wrong' | 'celebration'): void => {
  try {
    // 使用Web Audio API创建简单的音效
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (soundType) {
      case 'correct':
        // 欢快的上升音调
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;

      case 'wrong':
        // 下降的低沉音调
        oscillator.frequency.setValueAtTime(330, audioContext.currentTime); // E4
        oscillator.frequency.setValueAtTime(262, audioContext.currentTime + 0.1); // C4
        oscillator.frequency.setValueAtTime(196, audioContext.currentTime + 0.2); // G3
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;

      case 'celebration':
        // 庆祝音效 - 快速的上升音符序列
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);

          osc.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.1);
          gain.gain.setValueAtTime(0.2, audioContext.currentTime + index * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.15);

          osc.start(audioContext.currentTime + index * 0.1);
          osc.stop(audioContext.currentTime + index * 0.1 + 0.15);
        });
        break;
    }
  } catch (error) {
    console.warn('Sound effect not supported:', error);
  }
};

