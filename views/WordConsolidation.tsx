import React, { useState, useEffect } from 'react';
import { WordItem } from '../types';
import { WORDS_DATA, USER_NAME } from '../constants';
import TeacherAvatar from '../components/TeacherAvatar';
import SpeechBubble from '../components/SpeechBubble';
import AudioButton from '../components/AudioButton';
import AudioPlayback from '../components/AudioPlayback';
import StarEffect from '../components/StarEffect';
import FeedbackAnimation from '../components/FeedbackAnimation';
import { generateDetailedFeedback } from '../services/qwenService';
import { speakText, stopSpeaking } from '../services/ttsService';
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
  SUMMARY = 'SUMMARY'
}

const WordConsolidation: React.FC<Props> = ({ onBack, onComplete }) => {
  const [phase, setPhase] = useState<Phase>(Phase.INTRO);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [wordScores, setWordScores] = useState<{word: string, score: number, transcript: string}[]>([]);
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

  // Feedback Animation
  const [feedbackAnimation, setFeedbackAnimation] = useState<{
    type: 'thumbsUp' | 'keepTrying';
    show: boolean;
  } | null>(null);

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
      transcript: evaluationResult?.userTranscript || ''
    }]);

    setTimeout(() => {
      setIsProcessing(false);
      // 无论成功还是失败，都显示下一题按钮
      setTeacherMsg("朗读完成！准备进入下一题...");
      setShowNextButton(true);

      // 根据分数显示动画反馈
      const score = detailedFeedback.score;
      if (score >= 80) {
        setFeedbackAnimation({ type: 'thumbsUp', show: true });
      } else if (score < 60) {
        setFeedbackAnimation({ type: 'keepTrying', show: true });
      }
      // 60-79分不显示动画反馈

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
      // Done reading, go to summary
      setPhase(Phase.SUMMARY);
      setTeacherMsg("太棒了！所有单词都读完了！让我们来看看你的表现吧！");
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
    const allCorrect = mistakes.length === 0;

    if (allCorrect) {
      // 播放庆祝音效
      playSoundEffect('celebration');
      setTeacherMsg("太棒了！这些单词的释义你都学会了！现在，我们继续来巩固句型吧。");
    } else {
      setTeacherMsg(`掌握得真不错！下面这几个单词的意思，要多加巩固呦。`);
      // 显示答错单词列表（短暂弹出）
      setTimeout(() => {
        setTeacherMsg("现在，我们继续来巩固句型吧。");
        // 自动跳转到主流程
        setTimeout(() => {
          onComplete(mistakes);
        }, 2000);
      }, 3000);
    }

    // 播放语音
    if (allCorrect) {
      await speakText("太棒了！这些单词的释义你都学会了！现在，我们继续来巩固句型吧。", 'zh-CN');
      setTimeout(() => {
        onComplete(mistakes);
      }, 4000);
    } else {
      await speakText("掌握得真不错！下面这几个单词的意思，要多加巩固呦。", 'zh-CN');
      setTimeout(async () => {
        await speakText("现在，我们继续来巩固句型吧。", 'zh-CN');
        setTimeout(() => {
          onComplete(mistakes);
        }, 2000);
      }, 3000);
    }
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
          isWord={true}
          showFeedback={true}
        />

        {/* 下一题按钮 */}
        {showNextButton && (
          <div className="mt-6 text-center">
            <button
              onClick={handleNextWord}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 active:scale-95"
            >
              下一题
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

  const renderSummary = () => {
    // 计算统计数据
    const totalWords = wordScores.length;
    const averageScore = wordScores.reduce((sum, item) => sum + item.score, 0) / totalWords;
    const excellentCount = wordScores.filter(item => item.score >= 80).length;
    const goodCount = wordScores.filter(item => item.score >= 60 && item.score < 80).length;
    const needsImprovementCount = wordScores.filter(item => item.score < 60).length;

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
      // 调用父组件的onComplete，进入下一关
      onComplete(mistakes);
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
            {wordScores.map((item, index) => (
              <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{item.word}</span>
                    <span className="text-sm text-gray-600">"{item.transcript}"</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${
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
            onClick={handleNextChallenge}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            挑战下一关
          </button>
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
      {/* Feedback Animation */}
      {feedbackAnimation?.show && (
        <FeedbackAnimation
          type={feedbackAnimation.type}
          onComplete={() => setFeedbackAnimation(null)}
        />
      )}

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

      {/* 只在非朗读阶段显示TeacherAvatar */}
      {phase !== Phase.READING && (
        <div className="p-4 pb-0 flex-shrink-0">
          <TeacherAvatar message={teacherMsg} mood={phase === Phase.QUIZ ? 'excited' : 'happy'} />
        </div>
      )}

      <div className="flex-1 overflow-hidden" onClick={handleUserInteraction}>
        <div className="h-full overflow-y-auto custom-scrollbar">
          {phase === Phase.INTRO && renderIntro()}
          {phase === Phase.READING && renderReading()}
          {phase === Phase.QUIZ && renderQuiz()}
          {phase === Phase.SUMMARY && renderSummary()}
        </div>
      </div>
    </div>
  );
};

export default WordConsolidation;
