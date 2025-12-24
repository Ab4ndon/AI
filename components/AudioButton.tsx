import React, { useState, useEffect, useRef } from 'react';
import { Mic, CheckCircle, XCircle, Volume2 } from 'lucide-react';
import { SpeechRecognitionService } from '../services/speechRecognitionService';
import { evaluateSpeech, EvaluationResult } from '../services/speechEvaluationService';
import { AudioRecordingService } from '../services/audioRecordingService';

interface AudioButtonProps {
  onRecordStart: () => void;
  onRecordEnd: (result?: EvaluationResult, audioBlob?: Blob) => void;
  isProcessing: boolean;
  label?: string;
  size?: 'sm' | 'lg';
  expectedText?: string; // 期望的文本（用于测评）
  isWord?: boolean; // 是否为单词测评
  showFeedback?: boolean; // 是否显示实时反馈
}

const AudioButton: React.FC<AudioButtonProps> = ({ 
  onRecordStart, 
  onRecordEnd, 
  isProcessing, 
  label = "按住说话", 
  size = 'lg',
  expectedText = '',
  isWord = true,
  showFeedback = true
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null);
  const [micError, setMicError] = useState<string>('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const recognitionServiceRef = useRef<SpeechRecognitionService | null>(null);
  const audioRecordingServiceRef = useRef<AudioRecordingService | null>(null);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true);
  const finalTranscriptRef = useRef<string>(''); // 用于存储最终的识别结果
  const isRecordingRef = useRef<boolean>(false); // 用于跟踪是否仍在录音状态
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 用于跟踪重启定时器
  const recognitionActiveRef = useRef<boolean>(false); // 用于跟踪识别服务是否正在运行
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null); // 健康检查定时器
  
  // 创建新的识别服务实例
  const createNewRecognitionService = () => {
    if (recognitionServiceRef.current) {
      try {
        recognitionServiceRef.current.stop();
      } catch (e) {
        // 忽略错误
      }
    }
    try {
      recognitionServiceRef.current = new SpeechRecognitionService();
      return recognitionServiceRef.current;
    } catch (error) {
      console.error('Failed to create speech recognition service:', error);
      return null;
    }
  };

  useEffect(() => {
    // 初始化时创建识别服务和录音服务
    const recognitionService = createNewRecognitionService();
    setSpeechRecognitionSupported(recognitionService !== null && recognitionService.checkSupport());

    try {
      audioRecordingServiceRef.current = new AudioRecordingService();
    } catch (error) {
      console.error('Failed to initialize audio recording service:', error);
    }

    // 检查麦克风权限
    checkMicrophonePermission();
    return () => {
      // 清理时停止识别和清除定时器
      if (recognitionServiceRef.current) {
        try {
          recognitionServiceRef.current.stop();
        } catch (e) {
          // 忽略错误
        }
      }
      if (audioRecordingServiceRef.current) {
        audioRecordingServiceRef.current.abortRecording();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      isRecordingRef.current = false;
      recognitionActiveRef.current = false;
    };
  }, []);

  // 检查麦克风权限
  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (result.state === 'granted') {
        setMicPermissionGranted(true);
        setMicError('');
        return true;
      } else if (result.state === 'denied') {
        setMicPermissionGranted(false);
        setMicError('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
        return false;
      } else {
        // prompt - 尝试获取权限
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // 立即停止
          setMicPermissionGranted(true);
          setMicError('');
          return true;
        } catch (error) {
          setMicPermissionGranted(false);
          setMicError('无法获取麦克风权限，请允许网站访问麦克风');
          return false;
        }
      }
    } catch (error) {
      // 权限API不支持，尝试直接获取媒体
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setMicPermissionGranted(true);
        setMicError('');
        return true;
      } catch (error) {
        setMicPermissionGranted(false);
        setMicError('麦克风不可用，请检查麦克风连接');
        return false;
      }
    }
  };

  const handlePointerDown = async (e: React.PointerEvent) => {
    e.preventDefault();
    if (isProcessing || !speechRecognitionSupported) return;

    // 检查麦克风权限
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) {
      return;
    }

    setIsRecording(true);
    isRecordingRef.current = true; // 标记正在录音
    setCurrentTranscript('');
    setEvaluationResult(null);
    setMicError(''); // 清除之前的错误信息
    finalTranscriptRef.current = ''; // 重置最终结果

    // 开始音频录制
    if (audioRecordingServiceRef.current) {
      // 设置音量回调
      audioRecordingServiceRef.current.setVolumeCallback((volume) => {
        setVolumeLevel(volume);
      });

      audioRecordingServiceRef.current.startRecording().catch((error) => {
        console.error('Failed to start audio recording:', error);
        setMicError('录音启动失败，请重试');
        setIsRecording(false);
        isRecordingRef.current = false;
        setVolumeLevel(0);
      });
    }
    
    onRecordStart();

    // 开始语音识别（只用于实时显示，不进行测评）
    if (expectedText) {
      const startRecognition = () => {
        if (!isRecordingRef.current) {
          // 如果用户已经松开按钮，不再启动识别
          recognitionActiveRef.current = false;
          return;
        }

        // 每次启动时创建新的识别服务实例，避免状态问题
        const recognitionService = createNewRecognitionService();
        if (!recognitionService) {
          console.warn('Speech recognition not available');
          return;
        }
        recognitionActiveRef.current = true;
        
        recognitionService.start(
          (result) => {
            // 标记识别服务正在工作
            recognitionActiveRef.current = true;
            
            // 只显示实时识别文本，不进行测评
            setCurrentTranscript(result.transcript);
            
            // 保存识别结果
            if (result.isFinal) {
              // 最终结果：追加到已有文本（避免重复）
              const currentFinal = finalTranscriptRef.current.toLowerCase();
              const newText = result.transcript.toLowerCase().trim();
              if (!currentFinal.includes(newText)) {
                finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + result.transcript).trim();
              } else {
                // 如果已包含，更新为更完整的版本
                finalTranscriptRef.current = result.transcript;
              }
            } else {
              // 临时结果：只用于显示，不保存到最终结果
              // 最终结果保持不变
            }
          },
          (error) => {
            // 忽略静音错误，不停止录音
            if (error.includes('No speech') || error.includes('no-speech')) {
              // 静音错误，忽略，继续等待（识别服务会自动重启）
              recognitionActiveRef.current = false;
              return;
            }
            // 其他严重错误才停止
            console.error('Speech recognition error:', error);
            recognitionActiveRef.current = false;
            if (error.includes('not-allowed')) {
              setMicError('麦克风权限被拒绝，请允许网站访问麦克风');
              setCurrentTranscript('');
              setIsRecording(false);
              isRecordingRef.current = false;
            } else if (error.includes('audio-capture')) {
              setMicError('未检测到麦克风，请检查麦克风连接');
              setCurrentTranscript('');
              setIsRecording(false);
              isRecordingRef.current = false;
            } else {
              setMicError('语音识别出错，请重试');
            }
          },
          () => {
            // 识别结束时的处理（可能是静音自动停止）
            recognitionActiveRef.current = false;
            
            // 只有在用户还在按住按钮且识别服务不活跃时才重新启动
            if (isRecordingRef.current && !recognitionActiveRef.current) {
              // 清除之前的重启定时器（如果有）
              if (restartTimeoutRef.current) {
                clearTimeout(restartTimeoutRef.current);
              }
              
              // 立即重新启动，保持持续识别（创建新实例）
              // 使用 requestAnimationFrame 确保在下一个事件循环中执行
              restartTimeoutRef.current = setTimeout(() => {
                if (isRecordingRef.current) {
                  // 创建新的识别服务实例并启动
                  try {
                    startRecognition();
                  } catch (err) {
                    // 如果启动失败，立即重试（创建新实例）
                    restartTimeoutRef.current = setTimeout(() => {
                      if (isRecordingRef.current) {
                        try {
                          startRecognition();
                        } catch (e) {
                          // 如果还是失败，再试一次
                          restartTimeoutRef.current = setTimeout(() => {
                            if (isRecordingRef.current) {
                              try {
                                startRecognition();
                              } catch (e2) {
                                console.warn('Failed to restart recognition after multiple attempts');
                                recognitionActiveRef.current = false;
                              }
                            }
                          }, 1500); // 第三次重试延迟改为1.5秒
                        }
                      }
                    }, 1000); // 重试延迟改为1秒
                  }
                }
              }, 500); // 增加延迟到500ms，避免Web Speech API过于频繁调用
            } else {
              // 用户已经松开按钮，正常结束
              setIsRecording(false);
            }
          }
        );
      };
      
      startRecognition();
      
      // 启动健康检查：定期检查识别服务是否还在运行
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      healthCheckIntervalRef.current = setInterval(() => {
        // 如果用户还在录音，但识别服务不活跃，重新启动（创建新实例）
        if (isRecordingRef.current && !recognitionActiveRef.current) {
          try {
            startRecognition();
          } catch (err) {
            // 忽略错误，下次再试
          }
        }
      }, 300); // 每300ms检查一次，更频繁
    }
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    e.preventDefault();
    if (!isRecording) return;

    // 先标记已停止录音，这样 onend 回调就不会重启识别
    isRecordingRef.current = false;
    setIsRecording(false);
    setVolumeLevel(0); // 重置音量级别
    recognitionActiveRef.current = false;
    
    // 清除所有定时器
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    
    // 停止语音识别（停止后会触发 onend 事件，此时应该已经获取到最终结果）
    if (recognitionServiceRef.current) {
      recognitionServiceRef.current.stop();
    }

    // 停止音频录制并获取录音文件
    let recordedAudioBlob: Blob | null = null;
    if (audioRecordingServiceRef.current) {
      try {
        recordedAudioBlob = await audioRecordingServiceRef.current.stopRecording();
      } catch (error) {
        console.error('Failed to stop audio recording:', error);
      }
    }

    // 等待语音识别完全停止并获取最终结果，然后进行测评
    // 对于句子和段落，需要更长的等待时间
    const waitTime = isWord ? 600 : 1200; // 增加等待时间确保获取完整结果
    setTimeout(() => {
      // 使用 ref 中的最新结果，确保获取到完整的识别文本
      // 优先使用累积的最终结果，如果没有则使用当前显示的文本
      let finalText = finalTranscriptRef.current.trim();
      if (!finalText) {
        finalText = currentTranscript.trim();
      }
      
      // 清理文本：移除多余空格
      finalText = finalText.replace(/\s+/g, ' ').trim();
      
      // 检查是否有有效的录音数据
      const hasAudioData = recordedAudioBlob && recordedAudioBlob.size > 1000; // 至少1KB
      const hasTranscript = finalText.trim().length > 0;

      // 如果既没有音频数据也没有识别结果，给出提示
      if (!hasAudioData && !hasTranscript) {
        setMicError('没有检测到语音，请确保：\n1. 麦克风工作正常\n2. 说话距离麦克风较近\n3. 周围环境安静\n4. 说话声音足够大');
        onRecordEnd(null, null);
        return;
      }

      // 无论是否有识别结果，都进行测评（包括空文本的情况）
      const evaluation = evaluateSpeech(finalText, expectedText, isWord);
      setEvaluationResult(evaluation);
      onRecordEnd(evaluation, recordedAudioBlob || undefined);
    }, waitTime);
  };

  const sizeClasses = size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';
  const iconSize = size === 'lg' ? 40 : 24;

  return (
    <div className="flex flex-col items-center gap-3 select-none touch-none">
      {/* 固定高度的反馈区域，确保按钮位置稳定 */}
      <div className="h-16 flex items-center justify-center">
        {/* 实时反馈显示 */}
        {showFeedback && isRecording && currentTranscript && (
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border-2 border-blue-200">
            <p className="text-sm font-semibold text-indigo-900">{currentTranscript}</p>
          </div>
        )}

        {/* 麦克风错误提示 */}
        {micError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <XCircle className="text-red-600" size={16} />
              <p className="text-sm text-red-700">{micError}</p>
            </div>
          </div>
        )}

        {/* 录音提示 */}
        {showFeedback && isRecording && !currentTranscript && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-blue-700">请大声清晰地说出内容...</p>
            </div>
          </div>
        )}

        {/* 测评结果反馈 */}
        {showFeedback && evaluationResult && !isRecording && (
          <div className={`px-4 py-2 rounded-xl shadow-lg border-2 ${
            evaluationResult.isCorrect
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {evaluationResult.isCorrect ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : (
                <XCircle className="text-red-600" size={20} />
              )}
              <p className={`text-sm font-bold ${
                evaluationResult.isCorrect ? 'text-green-700' : 'text-red-700'
              }`}>
                {evaluationResult.feedback}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 录音按钮 - 固定位置 */}
      <div className="relative">
        {isRecording && (
          <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
        )}

        {/* 音量指示器 */}
        {isRecording && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-1">
            <Volume2 size={16} className="text-blue-600" />
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`w-1 h-3 rounded-sm transition-colors ${
                    volumeLevel > level * 0.2
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          disabled={isProcessing || !speechRecognitionSupported || micPermissionGranted === false}
          className={`${sizeClasses} rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-95 relative z-10 ${
            isRecording
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/50 scale-110'
              : isProcessing || !speechRecognitionSupported || micPermissionGranted === false
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 text-white shadow-indigo-900/20 hover:scale-105'
          }`}
        >
          {isProcessing ? (
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Mic size={iconSize} fill={isRecording ? "currentColor" : "none"} />
          )}
        </button>
      </div>

      {/* 标签 */}
      <span className={`font-bold text-sm tracking-wide transition-colors ${
        isRecording
          ? 'text-blue-500'
          : !speechRecognitionSupported
            ? 'text-red-500'
            : evaluationResult
              ? evaluationResult.isCorrect
                ? 'text-green-500'
                : 'text-red-500'
              : 'text-indigo-400'
      }`}>
        {isRecording ? "Listening..." : !speechRecognitionSupported ? "语音识别不可用" : label}
      </span>
    </div>
  );
};

export default AudioButton;
