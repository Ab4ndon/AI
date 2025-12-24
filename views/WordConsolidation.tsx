import React, { useState, useEffect } from 'react';
import { WordItem } from '../types';
import { WORDS_DATA, USER_NAME } from '../constants';
import TeacherAvatar from '../components/TeacherAvatar';
import SpeechBubble from '../components/SpeechBubble';
import AudioButton from '../components/AudioButton';
import AudioPlayback from '../components/AudioPlayback';
import StarEffect from '../components/StarEffect';
import SharePoster from '../components/SharePoster';
import { generateDetailedFeedback } from '../services/qwenService';
import { speakText, speakSimpleText, stopSpeaking } from '../services/ttsService';
import { playSoundEffect } from '../services/soundEffectService';
import { ArrowLeft, Volume2, Check } from 'lucide-react';

interface Props {
  onBack: () => void;
  onComplete: (mistakes: string[]) => void;
}

enum Phase {
  INTRO = 'INTRO',
  READING = 'READING',
  QUIZ = 'QUIZ',
  SUMMARY = 'SUMMARY',
  PRACTICE = 'PRACTICE', // 专项跟读练习阶段
  SUMMARY_PHASE = 'SUMMARY_PHASE' // 朗读完成后的总结页面
}

const WordConsolidation: React.FC<Props> = ({ onBack, onComplete }) => {
  const [phase, setPhase] = useState<Phase>(Phase.INTRO);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [wordScores, setWordScores] = useState<{word: string, score: number, transcript: string, recording?: Blob}[]>([]);
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);
  const [practiceWords, setPracticeWords] = useState<string[]>([]); // 需要练习的单词
  const [showSharePoster, setShowSharePoster] = useState(false); // 是否显示分享海报
  const [practiceResults, setPracticeResults] = useState<{word: string, score: number, transcript: string}[]>([]); // 练习结果
  const [isPracticeRestarting, setIsPracticeRestarting] = useState(false); // 防止重复重启练习
  const [teacherMsg, setTeacherMsg] = useState(`让我们来复习一下今天学的单词吧！`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [pendingVoices, setPendingVoices] = useState<string[]>([]);
  const [showNextButton, setShowNextButton] = useState(false);

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
      playVoiceWithFallback(`欢迎来到单词巩固环节，${USER_NAME}！这里有8个精彩的单词等着你来挑战呢！`);
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
  
  // Audio playback state
  const [lastRecording, setLastRecording] = useState<Blob | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastScore, setLastScore] = useState<number | undefined>(undefined);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  // Skip functionality
  const [retryCount, setRetryCount] = useState(0);
  const [showSkipButton, setShowSkipButton] = useState(false);
  
  // Quiz State
  const [quizOptions, setQuizOptions] = useState<WordItem[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [showStarEffect, setShowStarEffect] = useState(false);


  // 监听状态变化，停止音频播放
  useEffect(() => {
    stopSpeaking();
  }, [currentIndex, phase]);

  // Phase 1: Intro List
  const startReading = () => {
    setPhase(Phase.READING);
    setCurrentIndex(0);
    setShowNextButton(false);
    setTeacherMsg(`准备好了吗？让我们来读第一个单词"${WORDS_DATA[0].word}"！`);
    setFeedbackMessage('');
  };

  // Phase 2: Reading Logic
  const handleRecordEnd = async (evaluationResult?: any, audioBlob?: Blob) => {
    setIsProcessing(true);

    const currentWord = WORDS_DATA[currentIndex];
    const isSuccess = evaluationResult?.isCorrect ?? false;

    // 保存录音
    if (audioBlob) {
      setLastRecording(audioBlob);
    }

    // 计算重试次数（用于AI评价）
    const currentRetryCount = retryCount;
    const newRetryCount = isSuccess ? 0 : currentRetryCount + 1;

    // 生成详细的AI评价和建议（这里会确保有正确的评分）
    const detailedFeedback = await generateDetailedFeedback(
      currentWord.word,
      evaluationResult?.userTranscript || currentWord.word,
      evaluationResult,
      true,
      newRetryCount
    );

    setFeedbackMessage(detailedFeedback.message);
    setSuggestions(detailedFeedback.suggestions);
    setLastScore(detailedFeedback.score); // 使用AI生成的评分

    // 记录单词分数
    setWordScores(prev => [...prev, {
      word: currentWord.word,
      score: detailedFeedback.score,
      transcript: evaluationResult?.userTranscript || '',
      recording: audioBlob || undefined
    }]);

    setTimeout(() => {
      setIsProcessing(false);
      // 无论成功还是失败，都显示下一题按钮
      setTeacherMsg("朗读完成！准备进入下一题...");
      setShowNextButton(true);

      // 分数反馈现在通过AI语音提供

      // 如果AI判断需要播放语音指导（每3次失败），播放跟读指导
      if (detailedFeedback.shouldPlayGuidance) {
        setTimeout(async () => {
          try {
            await speakText(`加油哦${USER_NAME}，跟我读${currentWord.word}`, 'zh-CN');
          } catch (error) {
            console.error('语音指导播放失败:', error);
          }
        }, 1500); // 在动画显示后播放语音指导
      }
    }, 2000);
  };

  // Skip functionality
  // 处理下一题
  const handleNextWord = () => {
    // 立即停止所有音频播放
    stopSpeaking();

    const currentWord = WORDS_DATA[currentIndex];

    // 重置状态
    setShowNextButton(false);
    setFeedbackMessage('');
    setLastRecording(null);
    setSuggestions([]);
    setSelectedQuizId(null);

    // Next word
    if (currentIndex < WORDS_DATA.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTeacherMsg(`下一个单词是"${WORDS_DATA[currentIndex + 1].word}"`);
    } else {
      // 所有单词朗读完成，进入总结页面
      setPhase(Phase.SUMMARY_PHASE);

      // 播放总结语音
      setTimeout(async () => {
        try {
          await speakText(`恭喜你${USER_NAME}，完成了所有单词，下面来看看你的表现吧！`, 'zh-CN');
        } catch (error) {
          console.error('总结语音播放失败:', error);
        }
      }, 500);
    }
  };

  const handleSkip = () => {
    // 停止当前正在播放的音频
    stopSpeaking();

    const currentWord = WORDS_DATA[currentIndex];
    setMistakes(prev => [...prev, currentWord.word]);

    // 重置状态
    setRetryCount(0);
    setShowSkipButton(false);
    setShowNextButton(false);
    setFeedbackMessage('');
    setLastRecording(null);
    setSuggestions([]);
    setSelectedQuizId(null); // 重置quiz选择状态

    // 根据当前阶段跳到下一个项目
    if (phase === Phase.READING) {
      // 朗读阶段跳过
      if (currentIndex < WORDS_DATA.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setTeacherMsg(`没关系，我们跳过这个单词。下一个是"${WORDS_DATA[currentIndex + 1].word}"`);
      } else {
        // 完成所有单词，进入测验阶段
        setPhase(Phase.QUIZ);
        setCurrentIndex(0);
        prepareQuiz(0);
        setTeacherMsg("太棒了！单词部分完成了！现在我们来玩看图选词游戏吧！");
      }
    } else if (phase === Phase.QUIZ) {
      // 测验阶段跳过
      if (currentIndex < WORDS_DATA.length - 1) {
        setCurrentIndex(prev => prev + 1);
        prepareQuiz(currentIndex + 1);
        setTeacherMsg(`没关系，我们跳过这个题目。下一个！`);
      } else {
        // 完成所有题目，显示总结
        showCompletionSummary();
      }
    }
  };

  // Phase 3: Quiz Logic
  const prepareQuiz = (index: number) => {
    const correct = WORDS_DATA[index];
    // Pick 3 distractors
    const others = WORDS_DATA.filter(w => w.id !== correct.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [correct, ...others].sort(() => 0.5 - Math.random());
    setQuizOptions(options);
    setSelectedQuizId(null);

    // 重置quiz相关的状态
    setRetryCount(0);
    setShowSkipButton(false);
  };

  // Completion Summary Logic
  const showCompletionSummary = async () => {
    // 看图选词完成后，直接跳转到首页，不显示庆祝消息
    // 这样首页会自动高亮巩固句型按钮
    onComplete(mistakes);
  };

  const handleQuizSelect = (id: string) => {
    setSelectedQuizId(id);
    const currentWord = WORDS_DATA[currentIndex];
    const isCorrect = id === currentWord.id;

    if (isCorrect) {
      // 重置quiz重试计数
      setRetryCount(0);
      setShowSkipButton(false);

      // 播放正确音效并显示星星特效
      playSoundEffect('correct');
      setShowStarEffect(true);
      setTeacherMsg("完全正确！我们继续下一个！");
      setTimeout(() => {
        setShowStarEffect(false);
        if (currentIndex < WORDS_DATA.length - 1) {
          setCurrentIndex(prev => prev + 1);
          prepareQuiz(currentIndex + 1);
        } else {
          // 完成所有题目，显示总结
          showCompletionSummary();
        }
      }, 1500); // 延长等待时间给星星特效
    } else {
      // 播放错误音效
      playSoundEffect('wrong');
      setTeacherMsg("不对哦，这是" + currentWord.word + "！");
      // 记录错误
      setMistakes(prev => [...prev, currentWord.word]);

      // 增加quiz重试计数
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);

      // 如果重试3次或更多，显示跳过按钮
      if (newRetryCount >= 3) {
        setShowSkipButton(true);
      } else {
        // 2秒后自动继续下一题
        setTimeout(() => {
          if (currentIndex < WORDS_DATA.length - 1) {
            setCurrentIndex(prev => prev + 1);
            prepareQuiz(currentIndex + 1);
          } else {
            // 完成所有题目，显示总结
            showCompletionSummary();
          }
        }, 2000);
      }
    }
  };

  // Renderers
  const renderIntro = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {WORDS_DATA.map(w => (
          <div key={w.id} className="glass-card p-3 rounded-xl flex items-center justify-between glass-card-hover">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                <img src={w.imageUrl} alt={w.word} className="w-full h-full object-cover" />
              </span>
              <div>
                <p className="font-bold text-gray-900 text-lg">{w.word}</p>
                <p className="text-xs text-gray-700">{w.type} {w.meaning}</p>
              </div>
            </div>
            <button
              onClick={() => {
                if ('speechSynthesis' in window) {
                  const utterance = new SpeechSynthesisUtterance(w.word);
                  utterance.lang = 'en-US';
                  utterance.rate = 0.8;
                  utterance.pitch = 1.0;
                  utterance.volume = 1.0;
                  window.speechSynthesis.speak(utterance);
                }
              }}
              className="text-blue-600 p-2 rounded-full bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
            >
              <Volume2 size={20} />
            </button>
          </div>
        ))}
      </div>
      <div className="p-4 glass-card border-t rounded-t-2xl">
        <button onClick={startReading} className="w-full gradient-button text-white py-4 rounded-2xl font-bold text-xl active:scale-95">
          开始朗读练习
        </button>
      </div>
    </div>
  );

  const renderReading = () => {
    const word = WORDS_DATA[currentIndex];
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6">
        <div className="glass-card p-8 rounded-3xl mb-6 w-full max-w-xs text-center card-shadow relative">
          <img src={word.imageUrl} alt={word.word} className="w-32 h-32 mx-auto rounded-xl mb-4 object-cover" />
          <div className="flex items-center justify-center gap-3 mb-2">
            <h2 className="text-4xl font-extrabold text-gray-900 drop-shadow-xl" style={{textShadow: '0 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.5)'}}>{word.word}</h2>
            <button
              onClick={() => {
                if ('speechSynthesis' in window) {
                  const utterance = new SpeechSynthesisUtterance(word.word);
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
          <p className="text-gray-800 text-lg font-medium" style={{textShadow: '0 1px 2px rgba(255,255,255,0.6)'}}>{word.meaning}</p>
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
          onRecordEnd={handleRecordEnd}
          isProcessing={isProcessing}
          label="按住朗读"
          expectedText={word.word}
          isWord={false} // 改为false以获得更长的等待时间，确保录音完整性
          showFeedback={true}
        />

        {/* 下一题按钮 */}
        {showNextButton && (
          <div className="mt-6 text-center">
            <button
              onClick={handleNextWord}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 active:scale-95"
            >
              下一个单词
            </button>
          </div>
        )}

        {/* 跳过按钮 - 显示重试次数提示 */}
        {showSkipButton && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-700 mb-2">
              已尝试 {retryCount} 次，感觉困难吗？
            </p>
            <button
              onClick={handleSkip}
              className="px-6 py-2 bg-gray-500 text-white rounded-full font-semibold shadow-lg hover:bg-gray-600 transition-colors active:scale-95"
            >
              {phase === Phase.QUIZ ? "跳过这个题目" : "跳过这个单词"}
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
      </div>
    );
  };

  const renderPractice = () => {
    const currentPracticeWord = practiceWords[practiceResults.length];

    if (!currentPracticeWord) {
      // 等待练习完成检查
      return (
        <div className="flex flex-col flex-1 items-center justify-center p-8">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">正在分析练习结果...</p>
          </div>
        </div>
      );
    }

    const handlePracticeRecordEnd = async (evaluationResult?: any, audioBlob?: Blob) => {
      if (!currentPracticeWord) return;

      setIsProcessing(true);

      // 生成AI评价
      const detailedFeedback = await generateDetailedFeedback(
        currentPracticeWord,
        evaluationResult?.userTranscript || currentPracticeWord,
        evaluationResult,
        true,
        0 // 练习阶段不传递重试次数
      );

      // 记录练习结果
      setPracticeResults(prev => [...prev, {
        word: currentPracticeWord,
        score: detailedFeedback.score,
        transcript: evaluationResult?.userTranscript || ''
      }]);

      // 检查练习是否完成
      if (practiceResults.length + 1 >= practiceWords.length) {
        // 练习完成，分析结果
        const stillWrongWords = [...practiceResults, {
          word: currentPracticeWord,
          score: detailedFeedback.score,
          transcript: evaluationResult?.userTranscript || ''
        }].filter(item => item.score < 80).map(item => item.word);

        setTimeout(() => {
          setIsProcessing(false);

          // 延迟后检查结果并决定下一步
          setTimeout(() => {
            if (stillWrongWords.length === 0) {
              // 练习后全对
              setTimeout(async () => {
                try {
                  await speakText("太棒了！现在所有单词的读音都掌握啦！我们去挑战看图选词吧！", 'zh-CN');
                  setTimeout(() => {
                    onComplete(mistakes);
                  }, 2000);
                } catch (error) {
                  console.error('AI语音播放失败:', error);
                  onComplete(mistakes);
                }
              }, 500);
            } else {
              // 练习后仍有错 - 重新开始练习
              if (!isPracticeRestarting) {
                setIsPracticeRestarting(true);

                setTimeout(async () => {
                  try {
                    // 停止任何正在播放的语音
                    stopSpeaking();

                    // 短暂延迟后开始新的语音
                    setTimeout(async () => {
                      await speakText("读得越来越好了！我们再来练习一遍这些单词吧！", 'zh-CN');

                      // 语音播放完后重新开始练习
                      setTimeout(() => {
                        setPracticeWords(stillWrongWords);
                        setPracticeResults([]);
                        setIsPracticeRestarting(false);
                      }, 1000);
                    }, 300);
                  } catch (error) {
                    console.error('AI语音播放失败:', error);
                    // 即使语音失败也要重新开始练习
                    setPracticeWords(stillWrongWords);
                    setPracticeResults([]);
                    setIsPracticeRestarting(false);
                  }
                }, 500);
              }
            }
          }, 500);
        }, 1000);
      } else {
        // 练习未完成，继续下一题
        setTimeout(() => {
          setIsProcessing(false);
        }, 1000);
      }
    };

    return (
      <div className="flex flex-col flex-1 p-4" onClick={handleUserInteraction}>
        {/* 练习进度 */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">专项跟读练习</h2>
          <p className="text-gray-600">
            进度：{practiceResults.length + 1} / {practiceWords.length}
          </p>
          <div className="flex justify-center gap-1 mt-2">
            {practiceWords.map((_, index) => (
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

        {/* 当前练习单词 */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-4xl font-bold text-blue-600">
                {currentPracticeWord}
              </div>
              <button
                onClick={async () => {
                  try {
                    await speakSimpleText(currentPracticeWord, 'en-US');
                  } catch (error) {
                    console.error('单词朗读失败:', error);
                    try {
                      await speakText(currentPracticeWord, 'en-US');
                    } catch (aiError) {
                      console.error('AI语音也失败:', aiError);
                    }
                  }
                }}
                className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95"
                title="点击听单词发音"
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
            expectedText={currentPracticeWord}
            isWord={false} // 改为false以获得更长的等待时间，确保录音完整性
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
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{result.word}</span>
                      <span className="text-sm text-gray-600">"{result.transcript}"</span>
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
      </div>
    );
  };

  const renderSummaryPhase = () => {
    // 计算统计数据 - 基于唯一单词去重
    const uniqueWords = new Map();
    wordScores.forEach(item => {
      // 如果单词不存在或当前分数更高，则更新
      if (!uniqueWords.has(item.word) || uniqueWords.get(item.word).score < item.score) {
        uniqueWords.set(item.word, item);
      }
    });
    const uniqueWordScores = Array.from(uniqueWords.values());

    const totalWords = uniqueWordScores.length;
    const averageScore = uniqueWordScores.reduce((sum, item) => sum + item.score, 0) / totalWords;
    const excellentCount = uniqueWordScores.filter(item => item.score >= 80).length;
    const goodCount = uniqueWordScores.filter(item => item.score >= 60 && item.score < 80).length;
    const needsImprovementCount = uniqueWordScores.filter(item => item.score < 60).length;

    const handleContinuePractice = () => {
      // 分析朗读结果，找出需要练习的单词（分数<80的）
      const wrongWords = wordScores
        .filter(item => item.score < 80)
        .map(item => item.word);

      if (wrongWords.length === 0) {
        // 如果没有错词，重新开始完整的朗读练习
        setPhase(Phase.INTRO);
        setCurrentIndex(0);
        setWordScores([]);
        setMistakes([]);
        setRetryCount(0);
        setTeacherMsg(`让我们来复习一下今天学的单词吧！`);
      } else {
        // 如果有错词，进入专项练习阶段
        setPracticeWords(wrongWords);
        setPracticeResults([]);
        setPhase(Phase.PRACTICE);
        setTeacherMsg("让我们来专项练习这些单词的发音吧！");
      }
    };

    const handleGoToQuiz = () => {
      // 进入看图选词游戏阶段
      setPhase(Phase.QUIZ);
      setCurrentIndex(0);
      prepareQuiz(0);
      setTeacherMsg("太棒了！现在让我们来玩看图选词游戏吧！");
    };

    return (
      <div className="flex flex-col flex-1 p-4 relative" onClick={handleUserInteraction}>
        {/* 分享按钮 - 右上方 */}
        <button
          onClick={() => setShowSharePoster(true)}
          className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 z-10"
          title="分享报告"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
        </button>

        {/* 庆祝效果 */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">单词朗读总结</h2>
          <p className="text-gray-600">看看你的朗读表现吧！</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {averageScore.toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">平均分数</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {excellentCount}
            </div>
            <div className="text-sm text-gray-600">优秀单词</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-yellow-600 mb-1">
              {goodCount}
            </div>
            <div className="text-sm text-gray-600">良好单词</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-red-600 mb-1">
              {needsImprovementCount}
            </div>
            <div className="text-sm text-gray-600">需要改进</div>
          </div>
        </div>

        {/* 单词详情列表 */}
        <div className="flex-1 overflow-hidden mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">朗读详情</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uniqueWordScores.map((item, index) => (
              <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900 block">{item.word}</span>
                      <span className="text-sm text-gray-600 block">"{item.transcript}"</span>
                    </div>
                    {item.recording && (
                      <button
                        onClick={() => {
                          // 播放录音
                          const audio = new Audio(URL.createObjectURL(item.recording!));
                          audio.play();
                        }}
                        className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-sm transition-colors"
                        title="播放录音"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ml-3 ${
                    item.score >= 80
                      ? 'bg-green-500 text-white'
                      : item.score >= 60
                      ? 'bg-yellow-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}>
                    {item.score}分
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={handleContinuePractice}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            继续练习
          </button>
          <button
            onClick={handleGoToQuiz}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            看图选词
          </button>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    // 计算统计数据 - 基于唯一单词去重
    const uniqueWords = new Map();
    wordScores.forEach(item => {
      // 如果单词不存在或当前分数更高，则更新
      if (!uniqueWords.has(item.word) || uniqueWords.get(item.word).score < item.score) {
        uniqueWords.set(item.word, item);
      }
    });
    const uniqueWordScores = Array.from(uniqueWords.values());

    const totalWords = uniqueWordScores.length;
    const averageScore = uniqueWordScores.reduce((sum, item) => sum + item.score, 0) / totalWords;
    const excellentCount = uniqueWordScores.filter(item => item.score >= 80).length;
    const goodCount = uniqueWordScores.filter(item => item.score >= 60 && item.score < 80).length;
    const needsImprovementCount = uniqueWordScores.filter(item => item.score < 60).length;

    const handleContinuePractice = () => {
      // 重置所有状态，重新开始
      setPhase(Phase.INTRO);
      setCurrentIndex(0);
      setWordScores([]);
      setMistakes([]);
      setRetryCount(0);
      setTeacherMsg(`让我们来复习一下今天学的单词吧！`);
    };

    const handleNextChallenge = () => {
      // 进入看图选词游戏阶段
      setPhase(Phase.QUIZ);
      setTeacherMsg("太棒了！现在让我们来玩看图选词游戏吧！");
    };

    return (
      <div className="flex flex-col flex-1 p-4" onClick={handleUserInteraction}>
        {/* 庆祝效果 */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">单词巩固完成！</h2>
          <p className="text-gray-600">看看你的表现吧！</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {averageScore.toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">平均分数</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {excellentCount}
            </div>
            <div className="text-sm text-gray-600">优秀单词</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-yellow-600 mb-1">
              {goodCount}
            </div>
            <div className="text-sm text-gray-600">良好单词</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-red-600 mb-1">
              {needsImprovementCount}
            </div>
            <div className="text-sm text-gray-600">需要改进</div>
          </div>
        </div>

        {/* 单词详情列表 */}
        <div className="flex-1 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-900 mb-3">单词详情</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uniqueWordScores.map((item, index) => (
              <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900 block">{item.word}</span>
                      <span className="text-sm text-gray-600 block">"{item.transcript}"</span>
                    </div>
                    {item.recording && (
                      <button
                        onClick={() => {
                          // 播放录音
                          const audio = new Audio(URL.createObjectURL(item.recording!));
                          audio.play();
                        }}
                        className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-sm transition-colors"
                        title="播放录音"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ml-3 ${
                    item.score >= 80
                      ? 'bg-green-500 text-white'
                      : item.score >= 60
                      ? 'bg-yellow-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}>
                    {item.score}分
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleContinuePractice}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            继续练习
          </button>
          <button
            onClick={() => setShowSharePoster(true)}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            📤 分享成果
          </button>
          <button
            onClick={handleNextChallenge}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            看图选词
          </button>
        </div>
      </div>
    );
  };

  const renderWelcomeAnimation = () => {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-8">
        {/* 庆祝效果 */}
        <div className="text-center mb-8">
          <div className="text-8xl mb-6 animate-bounce">🎉</div>
          <div className="text-6xl mb-4">👩‍🏫</div>
          <div className="text-2xl font-bold text-white mb-2 animate-pulse">
            Bella老师
          </div>
          <div className="text-lg text-white/90">
            正在为你准备成绩单...
          </div>
        </div>

        {/* 加载动画 */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    const word = WORDS_DATA[currentIndex];
    return (
      <div className="flex flex-col flex-1 p-4" onClick={handleUserInteraction}>
        <h3 className="text-center text-xl font-bold text-gray-900 mb-6">
          哪个是 <span className="text-gray-900 text-2xl font-bold">"{word.word}"</span>？
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {quizOptions.map(opt => {
            const isSelected = selectedQuizId === opt.id;
            const isCorrect = opt.id === word.id;
            const isWrongSelection = isSelected && !isCorrect;
            let borderClass = 'border-transparent';
            let overlayClass = '';

            if (isSelected && isCorrect) {
              borderClass = 'border-green-500 ring-2 ring-green-200';
              overlayClass = 'bg-green-500/20';
            } else if (isWrongSelection) {
              borderClass = 'border-red-500 ring-2 ring-red-200';
              overlayClass = 'bg-red-500/20';
            } else if (selectedQuizId && !isSelected && isCorrect) {
              // 显示正确答案（当用户选错时）
              borderClass = 'border-green-500 ring-2 ring-green-200';
              overlayClass = 'bg-green-500/20';
            }

            return (
              <button
                key={opt.id}
                onClick={() => selectedQuizId ? null : handleQuizSelect(opt.id)} // 选完后禁用点击
                disabled={!!selectedQuizId}
                className={`relative glass-card rounded-2xl p-2 border-4 ${borderClass} transition-all active:scale-95 card-shadow-hover ${selectedQuizId ? 'cursor-default' : ''}`}
              >
                <img src={opt.imageUrl} alt={opt.word} className="w-full aspect-square object-cover rounded-xl" />
                {(isSelected && isCorrect) && (
                   <div className={`absolute inset-0 ${overlayClass} rounded-xl flex items-center justify-center`}>
                     <Check className="text-green-600 bg-white rounded-full p-1" size={40} />
                   </div>
                )}
                {isWrongSelection && (
                   <div className={`absolute inset-0 ${overlayClass} rounded-xl flex items-center justify-center`}>
                     <span className="text-red-600 bg-white rounded-full p-1 text-2xl font-bold">✕</span>
                   </div>
                )}
                {selectedQuizId && !isSelected && isCorrect && (
                   <div className={`absolute inset-0 ${overlayClass} rounded-xl flex items-center justify-center`}>
                     <Check className="text-green-600 bg-white rounded-full p-1" size={40} />
                   </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gradient-bg-words">
      {/* 星星特效 */}
      <StarEffect show={showStarEffect} />

      {/* Header */}
      <div className="flex items-center p-4 glass-card z-10 rounded-b-2xl">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500">
          <ArrowLeft />
        </button>
        <span className="font-bold text-lg gradient-text-yellow ml-2">单词巩固</span>
        <div className="ml-auto flex gap-1">
          {WORDS_DATA.map((_, i) => (
             <div key={i} className={`h-2 w-2 rounded-full ${i <= currentIndex ? 'bg-yellow-400' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {/* 只在非朗读和非总结阶段显示TeacherAvatar */}
      {phase !== Phase.READING && phase !== Phase.SUMMARY && phase !== Phase.SUMMARY_PHASE && (
        <div className="p-4 pb-0 flex-shrink-0">
          <TeacherAvatar message={teacherMsg} mood={phase === Phase.QUIZ ? 'excited' : 'happy'} />
        </div>
      )}

      <div className="flex-1 overflow-hidden" onClick={handleUserInteraction}>
        <div className="h-full overflow-y-auto custom-scrollbar">
          {showWelcomeAnimation && renderWelcomeAnimation()}
          {phase === Phase.INTRO && renderIntro()}
          {phase === Phase.READING && renderReading()}
          {phase === Phase.QUIZ && renderQuiz()}
          {phase === Phase.PRACTICE && renderPractice()}
          {phase === Phase.SUMMARY && renderSummary()}
          {phase === Phase.SUMMARY_PHASE && renderSummaryPhase()}
        </div>
      </div>

      {/* 分享海报 */}
      {showSharePoster && (() => {
        // 计算去重后的数据
        const uniqueWords = new Map();
        wordScores.forEach(item => {
          // 如果单词不存在或当前分数更高，则更新
          if (!uniqueWords.has(item.word) || uniqueWords.get(item.word).score < item.score) {
            uniqueWords.set(item.word, item);
          }
        });
        const uniqueWordScores = Array.from(uniqueWords.values());

        return (
          <SharePoster
            type="words"
            scores={uniqueWordScores}
            averageScore={uniqueWordScores.reduce((sum, item) => sum + item.score, 0) / uniqueWordScores.length}
            excellentCount={uniqueWordScores.filter(item => item.score >= 80).length}
            goodCount={uniqueWordScores.filter(item => item.score >= 60 && item.score < 80).length}
            needsImprovementCount={uniqueWordScores.filter(item => item.score < 60).length}
            totalItems={uniqueWordScores.length}
            userName={USER_NAME}
            onBack={() => setShowSharePoster(false)}
            onPlayRecording={(index) => {
              // 播放对应录音
              const recording = uniqueWordScores[index]?.recording;
              if (recording) {
                const audio = new Audio(URL.createObjectURL(recording));
                audio.play();
              }
            }}
            recordings={uniqueWordScores.map(item => item.recording).filter(Boolean) as Blob[]}
          />
        );
      })()}
    </div>
  );
};

export default WordConsolidation;
