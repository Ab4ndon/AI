import React, { useState, useEffect } from 'react';
import { SENTENCES_DATA, GRAMMAR_CARDS, QUIZ_DATA, USER_NAME } from '../constants';
import TeacherAvatar from '../components/TeacherAvatar';
import SpeechBubble from '../components/SpeechBubble';
import AudioButton from '../components/AudioButton';
import AudioPlayback from '../components/AudioPlayback';
import SharePoster from '../components/SharePoster';
import { generateDetailedFeedback } from '../services/qwenService';
import { speakText, speakSimpleText, stopSpeaking } from '../services/ttsService';
import { ArrowLeft, Check, X, Volume2 } from 'lucide-react';

interface Props {
  onBack: () => void;
  onComplete: (mistakes: string[]) => void;
}

const SentenceConsolidation: React.FC<Props> = ({ onBack, onComplete }) => {
  const [step, setStep] = useState(0); // 0: Learn, 1: Read, 2: Practice, 3: Game
  const [currentIdx, setCurrentIdx] = useState(0); // For sentences or quiz
  const [teacherMsg, setTeacherMsg] = useState("今天我们要学习3个神奇的句型工具！");
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [pendingVoices, setPendingVoices] = useState<string[]>([]);

  // 用户交互检测
  const handleUserInteraction = () => {
    if (!userInteracted) {
      setUserInteracted(true);
      console.log('用户交互检测到，开始播放待处理语音');
      // 播放所有待播放的语音
      if (pendingVoices.length > 0) {
        playPendingVoices();
      }
    }
  };

  const playPendingVoices = async () => {
    for (const voice of pendingVoices) {
      try {
        await speakText(voice, 'zh-CN');
        // 在语音之间添加短暂延迟
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.log('播放待处理语音失败:', error);
      }
    }
    setPendingVoices([]);
  };

  const playVoiceWithFallback = async (text: string) => {
    // 如果用户已经交互过，直接播放，不添加到待处理列表
    if (userInteracted) {
      try {
        await speakText(text, 'zh-CN');
      } catch (error) {
        console.log('语音播放出错:', error);
      }
      return;
    }

    try {
      await speakText(text, 'zh-CN');
    } catch (error) {
      if (error instanceof Error && error.message === 'NotAllowedError') {
        // 如果是第一次交互限制，将语音添加到待播放列表
        setPendingVoices(prev => [...prev, text]);
        console.log('语音已添加到待播放列表，等待用户交互');
      } else {
        // 其他错误，记录但不处理
        console.log('语音播放出错:', error);
      }
    }
  };

  // 页面介绍词朗读
  useEffect(() => {
    // 短暂延迟后尝试播放介绍词
    const timeout = setTimeout(() => {
      playVoiceWithFallback(`欢迎来到句型巩固环节，${USER_NAME}！我们将通过学习和练习来掌握实用的句子结构！`);
    }, 500);
    return () => {
      clearTimeout(timeout);
      // 在组件卸载时停止语音
      stopSpeaking();
    };
  }, []);

  // 添加全局点击监听器来检测用户交互
  useEffect(() => {
    const handleGlobalClick = () => {
      handleUserInteraction();
      // 只监听一次
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };

    if (!userInteracted) {
      document.addEventListener('click', handleGlobalClick);
      document.addEventListener('touchstart', handleGlobalClick);
    }

    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [userInteracted]);
  const [mistakes, setMistakes] = useState<string[]>([]);
  
  // Audio playback state
  const [lastRecording, setLastRecording] = useState<Blob | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastScore, setLastScore] = useState<number | undefined>(undefined);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [practiceSentences, setPracticeSentences] = useState<string[]>([]); // 需要练习的句子
  const [practiceResults, setPracticeResults] = useState<{sentence: string, score: number, transcript: string}[]>([]); // 练习结果
  const [isPracticeRestarting, setIsPracticeRestarting] = useState(false); // 防止重复重启练习
  const [sentenceResults, setSentenceResults] = useState<{sentence: string, score: number, transcript: string}[]>([]); // 所有句子的朗读结果
  const [showPracticeComplete, setShowPracticeComplete] = useState(false); // 是否显示练习完成按钮
  const [practiceCompleteMessage, setPracticeCompleteMessage] = useState(''); // 练习完成消息
  const [showSummary, setShowSummary] = useState(false); // 是否显示总结界面
  const [summaryMessage, setSummaryMessage] = useState(''); // 总结消息
  const [showSharePoster, setShowSharePoster] = useState(false); // 是否显示分享海报

  // Game state
  const [gameResult, setGameResult] = useState<'correct' | 'wrong' | null>(null);

  // 监听状态变化，停止音频播放
  useEffect(() => {
    stopSpeaking();
  }, [currentIdx, step]);

  // Skip functionality
  const [retryCount, setRetryCount] = useState(0);
  const [showSkipButton, setShowSkipButton] = useState(false);

  // --- Logic ---

  const startReading = () => {
    setStep(1);
    setCurrentIdx(0);
    setTeacherMsg("让我们来朗读这些句子吧！");
    setFeedbackMessage('');
  };

  const handleNextSentence = () => {
    if (currentIdx < SENTENCES_DATA.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setRetryCount(0);
      setShowSkipButton(false);
      setFeedbackMessage('');
      setSuggestions([]);
      setLastRecording(null);
      setLastScore(0);
      setTeacherMsg("太棒了！下一个句子！");
    } else {
      // 句子朗读完成，进入练习阶段
      startPractice();
    }
  };

  const startPractice = () => {
    // 分析所有句子的朗读结果
    const totalSentences = sentenceResults.length;
    const correctSentences = sentenceResults.filter(item => item.score >= 80).length;
    const wrongSentences = sentenceResults
      .filter(item => item.score < 80)
      .map(item => item.sentence);

    // 显示总结界面
    setShowSummary(true);
    setPracticeSentences(wrongSentences);

    // 生成总结消息
    let summaryMsg = '';
    if (wrongSentences.length === 0) {
      summaryMsg = `太棒了！你把${totalSentences}个句子都读得又准又好听！`;
    } else {
      summaryMsg = `你读了${totalSentences}个句子，其中${correctSentences}个读得很好，还有${wrongSentences.length}个句子可以再练习一下。`;
    }
    setSummaryMessage(summaryMsg);

    // AI语音总结
    setTimeout(async () => {
      try {
        await speakText(summaryMsg, 'zh-CN');
      } catch (error) {
        console.error('AI语音总结失败:', error);
      }
    }, 500);
  };

  const handleContinuePractice = () => {
    setShowSummary(false);
    setPracticeResults([]);
    setStep(2); // 进入专项练习阶段

    // AI语音提示
    setTimeout(async () => {
      try {
        if (practiceSentences.length > 0) {
          await speakText("好的，让我们来练习这些句子吧！", 'zh-CN');
        }
      } catch (error) {
        console.error('AI语音提示失败:', error);
      }
    }, 500);
  };

  const handleGoToGame = () => {
    setShowSummary(false);
    setStep(3); // 直接进入游戏阶段

    // AI语音提示
    setTimeout(async () => {
      try {
        await speakText("好的，让我们去看图选词吧！", 'zh-CN');
      } catch (error) {
        console.error('AI语音提示失败:', error);
      }
    }, 500);
  };

  const handleReadComplete = async (evaluationResult?: any, audioBlob?: Blob) => {
    setIsProcessing(true);
    const sentence = SENTENCES_DATA[currentIdx];
    const isSuccess = evaluationResult?.isCorrect ?? false;

    // 保存录音
    if (audioBlob) {
      setLastRecording(audioBlob);
    }

    // 生成详细的AI评价和建议（这里会确保有正确的评分）
    const detailedFeedback = await generateDetailedFeedback(
      sentence.text,
      evaluationResult?.userTranscript || sentence.text,
      evaluationResult,
      false,
      retryCount
    );

    setFeedbackMessage(detailedFeedback.message);
    setSuggestions(detailedFeedback.suggestions);
    setLastScore(detailedFeedback.score); // 使用AI生成的评分

    // 记录句子朗读结果
    setSentenceResults(prev => [...prev, {
      sentence: sentence.text,
      score: detailedFeedback.score,
      transcript: evaluationResult?.userTranscript || ''
    }]);

    setTimeout(() => {
      setIsProcessing(false);
      if (isSuccess) {
        // 停止当前正在播放的音频
        stopSpeaking();

        // 重置重试计数
        setRetryCount(0);
        setShowSkipButton(false);

        // 评测通过，自动进入下一题
        if (currentIdx < SENTENCES_DATA.length - 1) {
          setCurrentIdx(prev => prev + 1);
          setTeacherMsg("太棒了！下一个句子！");
          setFeedbackMessage('');
          setLastRecording(null);
          setSuggestions([]);
        } else {
          setStep(2); // Go to Game
          setCurrentIdx(0);
          setTeacherMsg("读得很好！现在我们来玩「对错游戏」吧！");
          setFeedbackMessage('');
          setLastRecording(null);
          setSuggestions([]);
        }
      } else {
        // 如果发音不对，让用户重试
        setMistakes(prev => [...prev, sentence.text]);

        // 增加重试计数
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);

        // 如果重试3次或更多，显示跳过按钮
        if (newRetryCount >= 3) {
          setShowSkipButton(true);
        }

        // 取消AI语音提示，只保留文字反馈
      }
    }, 2000);
  };

  // Skip functionality
  const handleSkip = () => {
    // 停止当前正在播放的音频
    stopSpeaking();

    const sentence = SENTENCES_DATA[currentIdx];
    setMistakes(prev => [...prev, sentence.text]);

    // 重置状态
    setRetryCount(0);
    setShowSkipButton(false);
    setFeedbackMessage('');
    setLastRecording(null);
    setSuggestions([]);

    // 跳到下一个句子
    if (currentIdx < SENTENCES_DATA.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setTeacherMsg(`没关系，我们跳过这个句子。下一个句子！`);
    } else {
      // 完成所有句子，进入游戏阶段
      setStep(2);
      setCurrentIdx(0);
      setTeacherMsg("句子部分完成了！现在我们来玩「对错游戏」吧！");
    }
  };

  const handleGameChoice = (choice: boolean) => {
    const item = QUIZ_DATA[currentIdx];
    const isCorrect = choice === item.isCorrect;

    if (isCorrect) {
      setGameResult('correct');
      setTeacherMsg("答对了！");
      setTimeout(() => {
        setGameResult(null);
        if (currentIdx < QUIZ_DATA.length - 1) {
          setCurrentIdx(prev => prev + 1);
        } else {
          onComplete(mistakes);
        }
      }, 1200);
    } else {
      setGameResult('wrong');
      setTeacherMsg("再想想看！看看图片。");
      setTimeout(() => setGameResult(null), 1000);
    }
  };

  // --- Renders ---

  const renderCards = () => (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="space-y-4 mb-6">
        {GRAMMAR_CARDS.map((card, i) => (
          <div key={i} className="glass-card p-4 rounded-2xl border-l-4 border-white/30 glass-card-hover">
            <h4 className="font-bold text-gray-900 mb-1" style={{textShadow: '0 1px 2px rgba(255,255,255,0.8)'}}>{card.title}</h4>
            <p className="text-xl font-extrabold text-gray-900" style={{textShadow: '0 1px 2px rgba(255,255,255,0.8)'}}>{card.content}</p>
            {card.sub && <p className="text-lg font-semibold text-gray-700 ml-4" style={{textShadow: '0 1px 2px rgba(255,255,255,0.6)'}}>→ {card.sub}</p>}
            <p className="text-xs text-gray-600 mt-2 text-right" style={{textShadow: '0 1px 2px rgba(255,255,255,0.5)'}}>{card.desc}</p>
          </div>
        ))}
      </div>
      <button onClick={startReading} className="mt-auto w-full gradient-button text-white py-4 rounded-2xl font-bold text-xl">
        开始练习句子
      </button>
    </div>
  );

  const renderReading = () => {
    const item = SENTENCES_DATA[currentIdx];
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6">
        <div className="w-full glass-card p-6 rounded-3xl mb-6 min-h-[160px] flex flex-col items-center justify-center text-center card-shadow relative">
          <p className="text-2xl font-extrabold text-gray-900 leading-relaxed mb-4" style={{textShadow: '0 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.5)'}}>{item.text}</p>
          <button
            onClick={() => {
              if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(item.text);
                utterance.lang = 'en-US';
                utterance.rate = 0.8;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                window.speechSynthesis.speak(utterance);
              }
            }}
            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-full transition-colors"
            title="播放发音"
          >
            <Volume2 size={20} className="text-blue-600" />
          </button>
        </div>
        
        {/* 对话气泡 - 显示评价和建议 */}
        {feedbackMessage && (
          <div className="mb-6 w-full max-w-sm">
            <SpeechBubble 
              message={feedbackMessage}
              suggestions={suggestions}
            />
          </div>
        )}

        <AudioButton
          onRecordStart={() => {
            // 用户开始录音时，停止所有正在播放的AI语音
            stopSpeaking();
          }}
          onRecordEnd={handleReadComplete}
          isProcessing={isProcessing}
          label="按住朗读"
          expectedText={item.text}
          isWord={false}
          showFeedback={true}
        />

        {/* 跳过按钮 - 显示重试次数提示 */}
        {showSkipButton && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 mb-2">
              已尝试 {retryCount} 次，感觉困难吗？
            </p>
            <button
              onClick={handleSkip}
              className="px-6 py-2 bg-gray-500 text-white rounded-full font-semibold shadow-lg hover:bg-gray-600 transition-colors active:scale-95"
            >
              跳过这个句子
            </button>
          </div>
        )}

        {/* 录音回放 */}
        {lastRecording && lastRecording.size > 0 && (
          <div className="mt-6 w-full max-w-sm">
            <AudioPlayback
              audioBlob={lastRecording}
              suggestions={suggestions}
              evaluationScore={lastScore}
            />
          </div>
        )}
        
        {/* 控制按钮 - 只有在用户完成录音后才显示 */}
        {feedbackMessage && (
          <div className="mt-6 flex gap-4 justify-center">
            <button
              onClick={handleNextSentence}
              className="px-6 py-3 bg-blue-500 text-white rounded-full font-semibold shadow-lg hover:bg-blue-600 transition-colors active:scale-95"
            >
              下一个句子
            </button>
            {currentIdx === SENTENCES_DATA.length - 1 && (
              <button
                onClick={startPractice}
                className="px-6 py-3 bg-green-500 text-white rounded-full font-semibold shadow-lg hover:bg-green-600 transition-colors active:scale-95"
              >
                开始专项练习
              </button>
            )}
          </div>
        )}

        <div className="mt-4 text-sm text-gray-400 text-center">
          第 {currentIdx + 1} 句，共 {SENTENCES_DATA.length} 句
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    const totalSentences = sentenceResults.length;
    const correctSentences = sentenceResults.filter(item => item.score >= 80).length;
    const wrongSentences = sentenceResults.filter(item => item.score < 80);

    return (
      <div className="flex flex-col flex-1 p-4" onClick={handleUserInteraction}>
        {/* 总结标题 */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">朗读总结</h2>
          <p className="text-lg text-gray-700">{summaryMessage}</p>
        </div>

        {/* 详细统计 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {correctSentences}
            </div>
            <div className="text-sm text-gray-600">读得很好</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {totalSentences}
            </div>
            <div className="text-sm text-gray-600">总句数</div>
          </div>
        </div>

        {/* 错误句子列表（如果有的话） */}
        {wrongSentences.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3">可以继续练习的句子：</h3>
            <div className="space-y-2">
              {wrongSentences.map((result, index) => (
                <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-900 text-sm">{result.sentence}</span>
                      <span className="text-xs text-gray-600">"{result.transcript}"</span>
                    </div>
                    <div className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                      {result.score}分
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 选择按钮 */}
        <div className="flex gap-4 justify-center mt-auto">
          {wrongSentences.length > 0 && (
            <button
              onClick={handleContinuePractice}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-full font-semibold shadow-lg hover:bg-blue-600 transition-colors active:scale-95"
            >
              继续练习
            </button>
          )}
          <button
            onClick={() => setShowSharePoster(true)}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            📤 分享成果
          </button>
          <button
            onClick={handleGoToGame}
            className={`px-6 py-3 rounded-full font-semibold shadow-lg hover:opacity-90 transition-colors active:scale-95 ${
              wrongSentences.length > 0
                ? 'flex-1 bg-green-500 text-white hover:bg-green-600'
                : 'w-full bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            看图选词
          </button>
        </div>
      </div>
    );
  };

  const renderPractice = () => {
    const currentPracticeSentence = practiceSentences[practiceResults.length];

    if (!currentPracticeSentence) {
      // 练习完成，分析结果
      const stillWrongSentences = practiceResults
        .filter(item => item.score < 80)
        .map(item => item.sentence);

      if (stillWrongSentences.length === 0) {
        // 练习后全对
        setTimeout(async () => {
          try {
            await speakText("太好了！现在这些句子都读顺了！我们去玩游戏吧！", 'zh-CN');
            setTimeout(() => {
              setShowPracticeComplete(true);
              setPracticeCompleteMessage("太好了！现在这些句子都读顺了！");
            }, 2000);
          } catch (error) {
            console.error('AI语音播放失败:', error);
            setShowPracticeComplete(true);
            setPracticeCompleteMessage("太好了！现在这些句子都读顺了！");
          }
        }, 500);
        return null;
      } else {
        // 练习后仍有错 - 显示结果后显示按钮让用户点击进入游戏
        setTimeout(async () => {
          try {
            await speakText("越读越好了！这几个句子我们平时可以多念念。", 'zh-CN');

            // 显示错误句子列表2秒后显示按钮
            setTimeout(async () => {
              try {
                await speakText("现在我们出发去玩判断游戏！", 'zh-CN');
                setTimeout(() => {
                  setShowPracticeComplete(true);
                  setPracticeCompleteMessage("越读越好了！");
                }, 1500);
              } catch (error) {
                console.error('AI语音播放失败:', error);
                setShowPracticeComplete(true);
                setPracticeCompleteMessage("越读越好了！");
              }
            }, 2000);
          } catch (error) {
            console.error('AI语音播放失败:', error);
            setShowPracticeComplete(true);
            setPracticeCompleteMessage("越读越好了！");
          }
        }, 500);

        return (
          <div className="flex flex-col flex-1 items-center justify-center p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">需要继续练习的句子</h2>
              <div className="flex flex-col gap-2">
                {stillWrongSentences.map((sentence, index) => (
                  <span key={index} className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm">
                    {sentence}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      }
    }

    const handlePracticeRecordEnd = async (evaluationResult?: any, audioBlob?: Blob) => {
      if (!currentPracticeSentence) return;

      setIsProcessing(true);

      // 生成AI评价
      const detailedFeedback = await generateDetailedFeedback(
        currentPracticeSentence,
        evaluationResult?.userTranscript || currentPracticeSentence,
        evaluationResult,
        false, // 句子
        0 // 练习阶段不传递重试次数
      );

      // 记录练习结果
      setPracticeResults(prev => [...prev, {
        sentence: currentPracticeSentence,
        score: detailedFeedback.score,
        transcript: evaluationResult?.userTranscript || ''
      }]);

      // 练习完成后直接进入下一题，不再自动播放示范发音
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    };

    return (
      <div className="flex flex-col flex-1 p-4" onClick={handleUserInteraction}>
        {/* 练习进度 */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">专项跟读练习</h2>
          <p className="text-gray-600">
            进度：{practiceResults.length + 1} / {practiceSentences.length}
          </p>
          <div className="flex justify-center gap-1 mt-2">
            {practiceSentences.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index < practiceResults.length
                    ? 'bg-green-500'
                    : index === practiceResults.length
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 当前练习句子 */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-xl font-bold text-blue-600">
                {currentPracticeSentence}
              </div>
              <button
                onClick={async () => {
                  try {
                    await speakSimpleText(currentPracticeSentence, 'en-US');
                  } catch (error) {
                    console.error('句子朗读失败:', error);
                    try {
                      await speakText(currentPracticeSentence, 'en-US');
                    } catch (aiError) {
                      console.error('AI语音也失败:', aiError);
                    }
                  }
                }}
                className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95"
                title="点击听句子发音"
              >
                <Volume2 size={20} />
              </button>
            </div>
            <p className="text-gray-600">点击音量图标听发音，然后按住录音跟读</p>
          </div>

          {/* 录音按钮 */}
          <AudioButton
            onRecordStart={() => stopSpeaking()}
            onRecordEnd={handlePracticeRecordEnd}
            isProcessing={isProcessing}
            label="按住跟读"
            expectedText={currentPracticeSentence}
            isWord={false}
            showFeedback={true}
          />
        </div>

        {/* 练习结果展示 */}
        {practiceResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">练习结果</h3>
            <div className="space-y-2">
              {practiceResults.map((result, index) => (
                <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-900 text-sm">{result.sentence}</span>
                      <span className="text-xs text-gray-600">"{result.transcript}"</span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      result.score >= 80
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      {result.score}分
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 练习完成按钮 */}
        {showPracticeComplete && (
          <div className="mt-6 text-center">
            <p className="text-lg font-semibold text-gray-900 mb-4">{practiceCompleteMessage}</p>
            <button
              onClick={() => setStep(3)}
              className="px-8 py-3 bg-green-500 text-white rounded-full font-semibold shadow-lg hover:bg-green-600 transition-colors active:scale-95"
            >
              进入判断游戏
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderGame = () => {
    const item = QUIZ_DATA[currentIdx];
    return (
      <div className="flex flex-col flex-1 p-4 items-center">
         <div className="glass-card p-3 rounded-2xl w-full max-w-sm mb-6 relative overflow-hidden card-shadow">
            <img src={item.imageUrl} alt="Quiz" className="w-full h-48 object-cover rounded-xl" />
            <div className="mt-4 p-2 text-center">
               <p className="text-xl font-bold text-gray-900" style={{textShadow: '0 1px 2px rgba(255,255,255,0.6)'}}>"{item.sentence}"</p>
            </div>
            
            {/* Feedback Overlay */}
            {gameResult && (
              <div className={`absolute inset-0 bg-opacity-90 flex items-center justify-center ${gameResult === 'correct' ? 'bg-green-100' : 'bg-red-100'}`}>
                 {gameResult === 'correct' ? <Check size={80} className="text-green-500" /> : <X size={80} className="text-red-500" />}
              </div>
            )}
         </div>

         <div className="flex gap-8 w-full max-w-xs justify-center">
           <button 
            onClick={() => handleGameChoice(true)}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-200 shadow-lg active:scale-90 transition-transform">
             <Check size={40} className="text-green-600" />
           </button>
           <button 
            onClick={() => handleGameChoice(false)}
            className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center border-4 border-red-200 shadow-lg active:scale-90 transition-transform">
             <X size={40} className="text-red-600" />
           </button>
         </div>
      </div>
    );
  };

  console.log('SentenceConsolidation rendering with step:', step, 'currentIdx:', currentIdx);

  return (
    <div className="h-full flex flex-col gradient-bg-sentences">
      <div className="flex items-center p-4 glass-card z-10 rounded-b-2xl">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500">
          <ArrowLeft />
        </button>
        <span className="font-bold text-lg gradient-text-blue ml-2">句型巩固</span>
      </div>

      {/* 只在非朗读、非练习和非总结阶段显示TeacherAvatar */}
      {step !== 1 && step !== 2 && !showSummary && (
        <div className="p-4 pb-0 flex-shrink-0">
          <TeacherAvatar message={teacherMsg} />
        </div>
      )}

      <div className="flex-1 min-h-0" onClick={handleUserInteraction}>
        <div className="h-full overflow-y-auto custom-scrollbar">
          {step === 0 && renderCards()}
          {step === 1 && renderReading()}
          {showSummary && renderSummary()}
          {step === 2 && renderPractice()}
          {step === 3 && renderGame()}
        </div>
      </div>

      {/* 分享海报 */}
      {showSharePoster && (
        <SharePoster
          type="sentences"
          scores={sentenceResults}
          averageScore={sentenceResults.reduce((sum, item) => sum + item.score, 0) / sentenceResults.length}
          excellentCount={sentenceResults.filter(item => item.score >= 80).length}
          goodCount={sentenceResults.filter(item => item.score >= 60 && item.score < 80).length}
          needsImprovementCount={sentenceResults.filter(item => item.score < 60).length}
          totalItems={sentenceResults.length}
          userName={USER_NAME}
          onBack={() => setShowSharePoster(false)}
          onPlayRecording={(index) => {
            // 这里可以实现播放对应录音的逻辑
            console.log('播放录音:', index);
          }}
        />
      )}
    </div>
  );
};

export default SentenceConsolidation;
