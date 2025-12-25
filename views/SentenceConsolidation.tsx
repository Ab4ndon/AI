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
  const [step, setStep] = useState(0); // 0: Learn, 1: Read, 2: Practice, 3: Game, 4: Summary
  const [currentIdx, setCurrentIdx] = useState(0); // For sentences or quiz
  const [teacherMsg, setTeacherMsg] = useState("今天我们要学习1个神奇的句型工具！");
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
      playVoiceWithFallback(`欢迎来到句型巩固环节，${USER_NAME}！今天我们要学习1个神奇的句型工具！`);
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
  const [showNextButton, setShowNextButton] = useState(false); // 控制下一句按钮显示
  const [practiceSentences, setPracticeSentences] = useState<string[]>([]); // 需要练习的句子
  const [practiceResults, setPracticeResults] = useState<{sentence: string, score: number, transcript: string}[]>([]); // 练习结果
  const [isPracticeRestarting, setIsPracticeRestarting] = useState(false); // 防止重复重启练习
  const [sentenceResults, setSentenceResults] = useState<{sentence: string, score: number, transcript: string, recording?: Blob}[]>([]); // 所有句子的朗读结果
  const [showPracticeComplete, setShowPracticeComplete] = useState(false); // 是否显示练习完成按钮
  const [practiceCompleteMessage, setPracticeCompleteMessage] = useState(''); // 练习完成消息
  const [showSummary, setShowSummary] = useState(false); // 是否显示总结界面
  const [summaryMessage, setSummaryMessage] = useState(''); // 总结消息
  const [showSharePoster, setShowSharePoster] = useState(false); // 是否显示分享海报
  const [practiceCompleteVoicePlayed, setPracticeCompleteVoicePlayed] = useState(false); // 是否已经播放练习完成语音
  const [practiceIncompleteVoicePlayed, setPracticeIncompleteVoicePlayed] = useState(false); // 是否已经播放练习未完成语音

  // Game state
  const [gameResult, setGameResult] = useState<'correct' | 'wrong' | null>(null);

  // 监听状态变化，停止音频播放
  useEffect(() => {
    stopSpeaking();
  }, [currentIdx, step]);


  // --- Logic ---

  const startReading = () => {
    setStep(1);
    setCurrentIdx(0);
    setTeacherMsg("让我们来朗读这些句子吧！");
    setFeedbackMessage('');
    setShowNextButton(false);
  };

  const handleNextSentence = () => {
    if (currentIdx < SENTENCES_DATA.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setFeedbackMessage('');
      setSuggestions([]);
      setLastRecording(null);
      setLastScore(0);
      setShowNextButton(false);
    } else {
      // 句子朗读完成，进入总结页面
      setStep(4); // 进入总结阶段

      // 播放总结语音
      setTimeout(async () => {
        try {
          await speakText("太棒了！句子朗读练习完成了！让我们看看你的表现吧！", 'zh-CN');
        } catch (error) {
          console.error('总结语音播放失败:', error);
        }
      }, 500);
    }
  };

  const startPractice = () => {
    // 分析所有句子的朗读结果 - 基于唯一句子去重
    const uniqueSentences = new Map();
    sentenceResults.forEach(item => {
      // 如果句子不存在或当前分数更高，则更新
      if (!uniqueSentences.has(item.sentence) || uniqueSentences.get(item.sentence).score < item.score) {
        uniqueSentences.set(item.sentence, item);
      }
    });
    const uniqueSentenceScores = Array.from(uniqueSentences.values());

    const totalSentences = uniqueSentenceScores.length;
    const correctSentences = uniqueSentenceScores.filter(item => item.score >= 80).length;
    const wrongSentences = uniqueSentenceScores
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
    setPracticeCompleteVoicePlayed(false); // 重置完成语音状态
    setPracticeIncompleteVoicePlayed(false); // 重置未完成语音状态
    setShowPracticeComplete(false); // 隐藏完成界面
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
    // 检查是否全部句子都读对了
    const wrongSentences = sentenceResults.filter(item => item.score < 80);
    if (wrongSentences.length > 0) {
      // 如果还有句子没读对，不允许进入游戏
      setTimeout(async () => {
        try {
          await speakText("还有一些句子需要练习哦，我们先把它们练好吧！", 'zh-CN');
        } catch (error) {
          console.error('AI语音提示失败:', error);
        }
      }, 500);
      return;
    }

    // 全部读对才能进入游戏
    setShowSummary(false);
    setStep(3); // 进入游戏阶段

    // AI语音提示
    setTimeout(async () => {
      try {
        await speakText("好的，让我们去看词选图吧！", 'zh-CN');
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
      0
    );

    setFeedbackMessage(detailedFeedback.message);
    setSuggestions(detailedFeedback.suggestions);
    setLastScore(detailedFeedback.score); // 使用AI生成的评分

    // 记录句子朗读结果
    setSentenceResults(prev => [...prev, {
      sentence: sentence.text,
      score: detailedFeedback.score,
      transcript: evaluationResult?.userTranscript || '',
      recording: audioBlob || undefined
    }]);

    setTimeout(() => {
      setIsProcessing(false);
      if (isSuccess) {
        // 停止当前正在播放的音频
        stopSpeaking();

        // 评测通过，显示下一句按钮
        setShowNextButton(true);
      } else {
        // 如果发音不对，记录错误并继续下一句
        setMistakes(prev => [...prev, sentence.text]);
        setShowNextButton(true);
      }
    }, 2000);
  };


  const handleGameChoice = (choice: string) => {
    const item = QUIZ_DATA[currentIdx];
    const isCorrect = choice === item.correctAnswer;

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
        {showNextButton && (
          <div className="mt-6 flex gap-4 justify-center">
            <button
              onClick={handleNextSentence}
              className="px-6 py-3 bg-blue-500 text-white rounded-full font-semibold shadow-lg hover:bg-blue-600 transition-colors active:scale-95"
            >
              {currentIdx === SENTENCES_DATA.length - 1 ? "查看总结" : "下一个句子"}
            </button>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-400 text-center">
          第 {currentIdx + 1} 句，共 {SENTENCES_DATA.length} 句
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    // 计算统计数据 - 基于唯一句子去重
    const uniqueSentences = new Map();
    sentenceResults.forEach(item => {
      // 如果句子不存在或当前分数更高，则更新
      if (!uniqueSentences.has(item.sentence) || uniqueSentences.get(item.sentence).score < item.score) {
        uniqueSentences.set(item.sentence, item);
      }
    });
    const uniqueSentenceScores = Array.from(uniqueSentences.values());

    const totalSentences = uniqueSentenceScores.length;
    const correctSentences = uniqueSentenceScores.filter(item => item.score >= 80).length;
    const wrongSentences = uniqueSentenceScores.filter(item => item.score < 80);

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
            看词选图
          </button>
        </div>
      </div>
    );
  };

  const renderSummaryPhase = () => {
    // 计算统计数据 - 基于唯一句子去重
    const uniqueSentences = new Map();
    sentenceResults.forEach(item => {
      // 如果句子不存在或当前分数更高，则更新
      if (!uniqueSentences.has(item.sentence) || uniqueSentences.get(item.sentence).score < item.score) {
        uniqueSentences.set(item.sentence, item);
      }
    });
    const uniqueSentenceScores = Array.from(uniqueSentences.values());

    const totalSentences = uniqueSentenceScores.length;
    const averageScore = uniqueSentenceScores.reduce((sum, item) => sum + item.score, 0) / totalSentences;
    const excellentCount = uniqueSentenceScores.filter(item => item.score >= 80).length;
    const goodCount = uniqueSentenceScores.filter(item => item.score >= 60 && item.score < 80).length;
    const needsImprovementCount = uniqueSentenceScores.filter(item => item.score < 60).length;

    const handleContinuePractice = () => {
      // 分析朗读结果，找出需要练习的句子（分数<80的）
      const wrongSentences = sentenceResults
        .filter(item => item.score < 80)
        .map(item => item.sentence);

      if (wrongSentences.length === 0) {
        // 如果没有错句，重新开始完整的朗读练习
        setStep(1); // 回到朗读阶段
        setCurrentIdx(0);
        setSentenceResults([]);
        setRetryCount(0);
        setTeacherMsg("让我们来重新练习这些句子吧！");
      } else {
        // 如果有错句，设置专项练习
        setPracticeSentences(wrongSentences);
        setPracticeResults([]);
        setStep(2); // 进入专项练习阶段
        setTeacherMsg("让我们来专项练习这些句子吧！");
      }
    };

    const handleGoToGame = () => {
      // 进入看图选词游戏阶段
      setStep(3);
      setCurrentIdx(0);
      setTeacherMsg("");
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">句子朗读总结</h2>
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
            <div className="text-sm text-gray-600">优秀句子</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-yellow-600 mb-1">
              {goodCount}
            </div>
            <div className="text-sm text-gray-600">良好句子</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-red-600 mb-1">
              {needsImprovementCount}
            </div>
            <div className="text-sm text-gray-600">需要改进</div>
          </div>
        </div>

        {/* 句子详情列表 */}
        <div className="flex-1 overflow-hidden mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">朗读详情</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uniqueSentenceScores.map((item, index) => (
              <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900 text-sm block">{item.sentence}</span>
                      <span className="text-xs text-gray-600 block">"{item.transcript}"</span>
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
            onClick={handleGoToGame}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            看词选图
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
        if (!practiceCompleteVoicePlayed) {
          setPracticeCompleteVoicePlayed(true);
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
        }
        return null;
      } else {
        // 练习后仍有错 - 显示结果后显示按钮让用户点击进入游戏
        if (!practiceIncompleteVoicePlayed) {
          setPracticeIncompleteVoicePlayed(true);
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
        }

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
               <p className="text-xl font-bold text-gray-900" style={{textShadow: '0 1px 2px rgba(255,255,255,0.6)'}}>{item.sentence}</p>
               {item.questionType === 'choice' && item.options && (
                 <div className="mt-2 text-sm text-gray-600">
                   {item.correctAnswer === 'A' ? 'A. ' + item.options[0] + '    B. ' + item.options[1] :
                    'A. ' + item.options[0] + '    B. ' + item.options[1]}
                 </div>
               )}
            </div>

            {/* Feedback Overlay */}
            {gameResult && (
              <div className={`absolute inset-0 bg-opacity-90 flex items-center justify-center ${gameResult === 'correct' ? 'bg-green-100' : 'bg-red-100'}`}>
                 {gameResult === 'correct' ? <Check size={80} className="text-green-500" /> : <X size={80} className="text-red-500" />}
              </div>
            )}
         </div>

         <div className="flex gap-4 w-full max-w-xs">
           <button
            onClick={() => handleGameChoice('A')}
            className="flex-1 py-3 px-4 bg-blue-100 rounded-xl border-2 border-blue-200 shadow-lg active:scale-95 transition-transform text-center">
             <div className="font-bold text-blue-600 text-lg">A</div>
             {item.options && <div className="text-sm text-blue-700 mt-1">{item.options[0]}</div>}
           </button>
           <button
            onClick={() => handleGameChoice('B')}
            className="flex-1 py-3 px-4 bg-purple-100 rounded-xl border-2 border-purple-200 shadow-lg active:scale-95 transition-transform text-center">
             <div className="font-bold text-purple-600 text-lg">B</div>
             {item.options && <div className="text-sm text-purple-700 mt-1">{item.options[1]}</div>}
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
          {step === 4 && renderSummaryPhase()}
        </div>
      </div>

      {/* 分享海报 */}
      {showSharePoster && (() => {
        // 计算去重后的数据
        const uniqueSentences = new Map();
        sentenceResults.forEach(item => {
          // 如果句子不存在或当前分数更高，则更新
          if (!uniqueSentences.has(item.sentence) || uniqueSentences.get(item.sentence).score < item.score) {
            uniqueSentences.set(item.sentence, item);
          }
        });
        const uniqueSentenceScores = Array.from(uniqueSentences.values());

        return (
          <SharePoster
            type="sentences"
            scores={uniqueSentenceScores}
            averageScore={uniqueSentenceScores.reduce((sum, item) => sum + item.score, 0) / uniqueSentenceScores.length}
            excellentCount={uniqueSentenceScores.filter(item => item.score >= 80).length}
            goodCount={uniqueSentenceScores.filter(item => item.score >= 60 && item.score < 80).length}
            needsImprovementCount={uniqueSentenceScores.filter(item => item.score < 60).length}
            totalItems={uniqueSentenceScores.length}
            userName={USER_NAME}
            onBack={() => setShowSharePoster(false)}
            onPlayRecording={(index) => {
              // 播放对应录音
              const recording = uniqueSentenceScores[index]?.recording;
              if (recording) {
                const audio = new Audio(URL.createObjectURL(recording));
                audio.play();
              }
            }}
            recordings={uniqueSentenceScores.map(item => item.recording).filter(Boolean) as Blob[]}
          />
        );
      })()}
    </div>
  );
};

export default SentenceConsolidation;
