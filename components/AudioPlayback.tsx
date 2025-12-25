import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Lightbulb } from 'lucide-react';
import { AudioConverterService } from '../services/audioConverterService';

interface AudioPlaybackProps {
  audioBlob: Blob | null;
  suggestions?: string[];
  evaluationScore?: number;
  className?: string;
}

const AudioPlayback: React.FC<AudioPlaybackProps> = ({ 
  audioBlob, 
  suggestions = [],
  evaluationScore,
  className = '' 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let currentUrl: string | null = null;
    let isCancelled = false;

    if (audioBlob) {
      // 如果音频格式不是 wav，尝试转换为 wav
      const processAudio = async () => {
        let finalBlob = audioBlob;
        
        // 如果格式不是 wav 且浏览器支持转换，则转换
        if (!audioBlob.type.includes('wav') && AudioConverterService.isSupported()) {
          try {
            console.log('Converting audio to WAV format...');
            finalBlob = await AudioConverterService.convertToWav(audioBlob);
            console.log('Audio converted successfully');
          } catch (error) {
            console.warn('Failed to convert audio, using original:', error);
            // 转换失败，使用原始格式
          }
        }
        
        if (isCancelled) {
          return;
        }
        
        // 创建音频 URL
        const url = URL.createObjectURL(finalBlob);
        currentUrl = url;
        console.log('Created audio URL:', {
          url: url.substring(0, 50) + '...',
          blobSize: finalBlob.size,
          blobType: finalBlob.type
        });
        setAudioUrl(url);
      };
      
      processAudio();
      
      // 清理函数
      return () => {
        isCancelled = true;
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
          audioRef.current = null;
        }
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
      };
    } else {
      setAudioUrl(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    }
  }, [audioBlob]);

  useEffect(() => {
    // 清理音频元素
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = async () => {
    if (!audioUrl) {
      console.warn('No audio URL available');
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.preload = 'auto';
      
      // 添加错误处理
      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e, audioRef.current?.error);
        setIsPlaying(false);
        const error = audioRef.current?.error;
        if (error) {
          let errorMsg = '无法播放音频';
          if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
            errorMsg = '音频格式不支持，请尝试使用 Chrome 或 Edge 浏览器';
          } else if (error.code === MediaError.MEDIA_ERR_NETWORK) {
            errorMsg = '网络错误，无法加载音频';
          }
          alert(errorMsg);
        }
      };
      
      audioRef.current.onended = () => {
        console.log('Audio playback ended');
        setIsPlaying(false);
      };
      
      audioRef.current.onpause = () => {
        setIsPlaying(false);
      };
      
      audioRef.current.onloadeddata = () => {
        console.log('Audio loaded successfully, duration:', audioRef.current?.duration);
      };
      
      audioRef.current.oncanplay = () => {
        console.log('Audio can play');
      };
      
      // 等待音频加载
      try {
        audioRef.current.load();
        // 等待一小段时间确保加载完成
        await new Promise((resolve) => {
          if (audioRef.current) {
            if (audioRef.current.readyState >= 2) { // HAVE_CURRENT_DATA
              resolve(undefined);
            } else {
              audioRef.current.oncanplay = () => resolve(undefined);
              audioRef.current.onerror = () => resolve(undefined);
              // 超时保护
              setTimeout(() => resolve(undefined), 1000);
            }
          } else {
            resolve(undefined);
          }
        });
      } catch (error) {
        console.error('Failed to load audio:', error);
      }
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to play audio:', error);
        setIsPlaying(false);
        alert('无法播放音频。请检查浏览器是否允许自动播放。');
      }
    }
  };

  if (!audioBlob || !audioUrl) {
    return null;
  }

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border-2 border-indigo-200/50 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={handlePlay}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-indigo-900">回听你的发音</p>
        </div>
        <Volume2 className="text-indigo-400" size={20} />
      </div>

    </div>
  );
};

export default AudioPlayback;

