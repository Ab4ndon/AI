import React, { useState, useEffect } from 'react';
import { STORY_DATA, USER_NAME } from '../constants';
import TeacherAvatar from '../components/TeacherAvatar';
import SpeechBubble from '../components/SpeechBubble';
import AudioButton from '../components/AudioButton';
import AudioPlayback from '../components/AudioPlayback';
import StarEffect from '../components/StarEffect';
import { generateDetailedFeedback } from '../services/qwenService';

// AI分析重点词汇的函数
const analyzeKeyWords = async (storySegments: typeof STORY_DATA): Promise<string[]> => {
  const fullText = storySegments.map(seg => seg.text).join(' ');

  try {
    const response = await fetch('/api/dashscope/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_DASHSCOPE_API_KEY || ''}`,
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [
            {
              role: 'user',
              content: `分析以下英文故事，找出对7岁儿童学习最重要的10-15个重点词汇。这些词汇应该是：
1. 故事中的关键词汇
2. 相对生僻或需要特别注意的单词
3. 对理解故事发展有重要作用的词汇

故事内容：
"${fullText}"

请只返回词汇列表，用逗号分隔，不要其他解释。格式：word1,word2,word3`
            }
          ]
        },
        parameters: {
          temperature: 0.3,
          max_tokens: 200
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.output?.choices?.[0]?.message?.content || data.output?.choices?.[0]?.message?.text || '';

      // 解析返回的词汇列表
      const keywords = content.split(',').map((word: string) =>
        word.trim().toLowerCase().replace(/[^a-z]/g, '')
      ).filter((word: string) => word.length > 0);

      return keywords.slice(0, 15); // 限制最多15个
    }
  } catch (error) {
    console.error('AI分析重点词汇失败:', error);
  }

  // 回退方案：返回一些常见词汇
  return ['ugly', 'beautiful', 'happy', 'sad', 'tall', 'small', 'big', 'little', 'run', 'walk', 'see', 'look', 'say', 'tell', 'go'];
};
import { speakText, stopSpeaking } from '../services/ttsService';
import FeedbackAnimation from '../components/FeedbackAnimation';
import { evaluateSpeech } from '../services/speechEvaluationService';
import { ArrowLeft, Volume2, Sparkles } from 'lucide-react';

interface Props {
  onBack: () => void;
  onComplete: (mistakes: string[]) => void;
}

const TextReading: React.FC<Props> = ({ onBack, onComplete }) => {
  const [currentSegIdx, setCurrentSegIdx] = useState(-1); // -1 = Overview, 0...N = Reading segments
  const [teacherMsg, setTeacherMsg] = useState("让我们来读故事《Ugly Sunny》吧！先看看故事内容！");
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [pendingVoices, setPendingVoices] = useState<string[]>([]);

  // 新增状态用于分段朗读和智能反馈
  const [readingMode, setReadingMode] = useState<'overview' | 'segmented'>('overview');
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const [retryMode, setRetryMode] = useState(false); // 是否处于重试模式
  const [completedSegments, setCompletedSegments] = useState<number[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCompletionOptions, setShowCompletionOptions] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false); // 控制下一题按钮显示
  const [keyWords, setKeyWords] = useState<string[]>([]); // AI分析的重点词汇

  // Feedback Animation
  const [feedbackAnimation, setFeedbackAnimation] = useState<{
    type: 'thumbsUp' | 'keepTrying';
    show: boolean;
  } | null>(null);

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

  // 页面介绍词朗读和AI分析重点词汇
  useEffect(() => {
    // 短暂延迟后尝试播放介绍词
    const timeout = setTimeout(() => {
      playVoiceWithFallback(`欢迎来到课文朗读环节，${USER_NAME}！我们将一起阅读精彩的故事《Ugly Sunny》，享受英语学习的乐趣！`);
    }, 500);

    // AI分析重点词汇
    analyzeKeyWords(STORY_DATA).then(keywords => {
      setKeyWords(keywords);
    }).catch(error => {
      console.error('分析重点词汇失败:', error);
      // 使用默认词汇
      setKeyWords(['ugly', 'beautiful', 'happy', 'sad', 'tall', 'small', 'big', 'little', 'run', 'walk', 'see', 'look', 'say', 'tell', 'go']);
    });

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

  const startSegmentedReading = () => {
    setCurrentSegIdx(0);
    setTeacherMsg("让我们来读第一部分。你先试试看！");
    setFeedbackMessage('');
    setShowNextButton(false);
  };

  // Skip functionality
  const handleSkip = () => {
    const segment = STORY_DATA[currentSegIdx];

    // 重置状态
    setRetryCount(0);
    setShowSkipButton(false);
    setFeedbackMessage('');
    setLastRecording(null);
    setSuggestions([]);

    // 跳到下一个段落
    if (currentSegIdx < STORY_DATA.length - 1) {
      setCurrentSegIdx(prev => prev + 1);
      setTeacherMsg(`没关系，我们跳过这个部分。下一部分...`);
    } else {
      // 完成所有段落
      setTeacherMsg("哇！故事部分完成了！太了不起了！");
      setTimeout(() => onComplete([]), 2000);
    }
  };

  // 从语音识别结果中提取错词 - 改进版：智能匹配并过滤单词
  const extractWrongWords = (userTranscript: string, expectedText: string): string[] => {
    const wrongWords: string[] = [];

    // 清理文本
    const cleanUserText = userTranscript.toLowerCase().trim().replace(/[.,!?;:]/g, '');
    const cleanExpectedText = expectedText.toLowerCase().trim().replace(/[.,!?;:]/g, '');

    const userWords = cleanUserText.split(/\s+/).filter(w => w.length > 0);
    const expectedWords = cleanExpectedText.split(/\s+/).filter(w => w.length > 0);

    // 如果用户没有说话，返回过滤后的期望单词（最多5个）
    if (userWords.length === 0) {
      return filterAndLimitWords(expectedWords);
    }

    // 对每个期望单词，在用户单词中找到最佳匹配
    for (const expectedWord of expectedWords) {
      let bestMatch = '';
      let bestSimilarity = 0;

      // 在用户的所有单词中找到最相似的
      for (const userWord of userWords) {
        const similarity = calculateSimilarity(userWord, expectedWord);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = userWord;
        }
      }

      // 如果最佳匹配相似度低于阈值，认为这个词发音有问题
      if (bestSimilarity < 0.7) { // 降低阈值到70%，更严格
        wrongWords.push(expectedWord);
      }
    }

    // 过滤和限制单词数量
    return filterAndLimitWords(wrongWords);
  };

  // 过滤和限制重点练习单词
  const filterAndLimitWords = (words: string[]): string[] => {
    if (words.length === 0) return [];

    // 词性识别的简单启发式方法（基于常见单词特征）
    const likelyVerbs = ['is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'say', 'said', 'go', 'went', 'come', 'came', 'see', 'saw', 'know', 'knew', 'get', 'got', 'give', 'gave', 'take', 'took', 'make', 'made', 'think', 'thought', 'tell', 'told', 'work', 'worked', 'play', 'played', 'live', 'lived', 'feel', 'felt', 'look', 'looked', 'want', 'wanted', 'use', 'used', 'find', 'found', 'ask', 'asked', 'need', 'needed', 'help', 'helped', 'talk', 'talked', 'turn', 'turned', 'start', 'started', 'run', 'ran', 'move', 'moved', 'like', 'liked', 'love', 'loved', 'call', 'called', 'try', 'tried', 'ask', 'asked', 'walk', 'walked', 'wait', 'waited', 'sit', 'sat', 'stand', 'stood', 'lose', 'lost', 'pay', 'paid', 'meet', 'met', 'include', 'included', 'continue', 'continued', 'set', 'set', 'learn', 'learned', 'change', 'changed', 'lead', 'led', 'understand', 'understood', 'watch', 'watched', 'follow', 'followed', 'stop', 'stopped', 'create', 'created', 'speak', 'spoke', 'read', 'read', 'spend', 'spent', 'grow', 'grew', 'open', 'opened', 'walk', 'walked', 'win', 'won', 'offer', 'offered', 'remember', 'remembered', 'consider', 'considered', 'appear', 'appeared', 'buy', 'bought', 'serve', 'served', 'send', 'sent', 'expect', 'expected', 'build', 'built', 'stay', 'stayed', 'fall', 'fell', 'cut', 'cut', 'reach', 'reached', 'kill', 'killed', 'remain', 'remained'];
    const likelyNouns = ['time', 'year', 'people', 'way', 'day', 'man', 'woman', 'life', 'child', 'world', 'school', 'state', 'family', 'student', 'group', 'country', 'problem', 'hand', 'part', 'place', 'case', 'week', 'company', 'system', 'program', 'question', 'work', 'government', 'number', 'night', 'point', 'home', 'water', 'room', 'mother', 'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word', 'business', 'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power', 'hour', 'game', 'line', 'end', 'member', 'law', 'car', 'city', 'community', 'name', 'president', 'team', 'minute', 'idea', 'kid', 'body', 'information', 'back', 'parent', 'face', 'others', 'level', 'office', 'door', 'health', 'person', 'art', 'war', 'history', 'party', 'result', 'change', 'morning', 'reason', 'research', 'girl', 'guy', 'moment', 'air', 'teacher', 'force', 'education', 'baby', 'duck', 'sunny', 'brother', 'sister', 'park', 'cat', 'dog', 'water', 'swan', 'fantastic', 'ugly', 'beautiful', 'tall', 'strong', 'happy', 'sad', 'handsome'];

    // 优先选择动词和名词
    const verbsAndNouns = words.filter(word =>
      likelyVerbs.includes(word.toLowerCase()) ||
      likelyNouns.includes(word.toLowerCase())
    );

    // 如果动词和名词不够5个，补充其他单词
    const remainingWords = words.filter(word =>
      !likelyVerbs.includes(word.toLowerCase()) &&
      !likelyNouns.includes(word.toLowerCase())
    );

    // 组合单词，最多返回5个
    const selectedWords = [...verbsAndNouns, ...remainingWords].slice(0, 5);

    return selectedWords;
  };

  // 计算两个字符串的相似度（Levenshtein距离）
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const matrix: number[][] = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
  };

  const handleReadSegment = async (evaluationResult?: any, audioBlob?: Blob) => {
    setIsProcessing(true);
    const segment = STORY_DATA[currentSegIdx];

    // 保存录音
    if (audioBlob) {
      setLastRecording(audioBlob);
    }

    // 使用真实的语音识别结果进行评分
    const userTranscript = evaluationResult?.userTranscript || '';
    const expectedText = segment.text;

    // 进行句子级别的评分
    const sentenceEvaluation = evaluateSpeech(userTranscript, expectedText, false);

    // 提取错词
    const extractedWrongWords = extractWrongWords(userTranscript, expectedText);
    const wrongWordsCount = extractedWrongWords.length;

    // 更新错词状态，用于显示标红文本
    setWrongWords(extractedWrongWords);

    // 使用真实的评分结果来判断表现
    const accuracy = sentenceEvaluation.accuracy;
    setLastScore(sentenceEvaluation.score);

    // 特殊处理：没有听到声音的情况
    if (sentenceEvaluation.feedback.includes('没有听到你的声音')) {
      setFeedbackMessage(sentenceEvaluation.feedback);
      setTimeout(async () => {
        await speakText("没有听到你的声音哦！试试大声说出来吧！", 'zh-CN');
      }, 500);

      setTimeout(() => {
        setIsProcessing(false);
        setTeacherMsg("准备好就可以再试试啦！");
        setShowNextButton(false); // 不显示下一题按钮，让用户重试
      }, 2000);
      return; // 提前返回，不进入其他路径
    }

    // 三条智能反馈路径
    if (accuracy >= 0.9 || wrongWordsCount === 0) {
      // 路径A：优秀 (准确度≥90% 或没有错词)
      // 使用AI生成个性化反馈
      generateDetailedFeedback(expectedText, userTranscript, sentenceEvaluation, false).then(aiFeedback => {
        setFeedbackMessage(aiFeedback.message);
        setLastScore(aiFeedback.score);

        setTimeout(() => {
          const score = aiFeedback.score;
          if (score >= 80) {
            setFeedbackAnimation({ type: 'thumbsUp', show: true });
          } else if (score < 60) {
            setFeedbackAnimation({ type: 'keepTrying', show: true });
          }
          // 60-79分不显示动画反馈
        }, 500);

        setTimeout(() => {
          setIsProcessing(false);
          setTeacherMsg("太棒了！准备进入下一段...");
          setShowNextButton(true);
        }, 2000);
      }).catch(error => {
        console.error('AI反馈生成失败:', error);
        // 回退到默认反馈
        setFeedbackMessage("太棒了！你读得非常好！");
        setTimeout(async () => {
          await speakText("太棒了！你读得非常好！", 'zh-CN');
        }, 500);

        setTimeout(() => {
          setIsProcessing(false);
          setTeacherMsg("太棒了！准备进入下一段...");
          setShowNextButton(true);
        }, 2000);
      });

    } else if ((accuracy >= 0.6 && accuracy < 0.9) || (wrongWordsCount >= 1 && wrongWordsCount <= 3)) {
      // 路径B：需巩固 (准确度60%-90% 或 1-3个错词)
      const wordsToPractice = extractedWrongWords.length > 0 ? extractedWrongWords : filterAndLimitWords(expectedWords.split(/\s+/).filter(w => w.length > 0));
      setWrongWords(wordsToPractice);

      // 使用AI生成详细反馈和建议
      generateDetailedFeedback(expectedText, userTranscript, sentenceEvaluation, false).then(aiFeedback => {
        setFeedbackMessage(aiFeedback.message);
        setLastScore(aiFeedback.score);
        setSuggestions(aiFeedback.suggestions);

        // AI反馈生成后显示动画
        setTimeout(() => {
          const score = aiFeedback.score;
          if (score >= 80) {
            setFeedbackAnimation({ type: 'thumbsUp', show: true });
          } else if (score < 60) {
            setFeedbackAnimation({ type: 'keepTrying', show: true });
          }
          // 60-79分不显示动画反馈

          // 错词重练
          setTimeout(async () => {
            for (const word of wordsToPractice) {
              await speakText(`跟我读: ${word}`, 'zh-CN');
              setTeacherMsg(`请跟读: ${word}`);
              // 这里可以添加学生跟读的逻辑
              await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // 练习后显示下一题按钮
            await speakText("表现很好！准备进入下一段吧！", 'zh-CN');
            setTimeout(() => {
              setIsProcessing(false);
              setTeacherMsg("表现很好！准备进入下一段...");
              setShowNextButton(true);
            }, 1000);
          }, 1000);
        }, 500);
      }).catch(error => {
        console.error('AI反馈生成失败:', error);
        // 回退到默认反馈
        setFeedbackMessage(`这一段基本读对了！我们特别注意一下这个词的发音。`);
        setSuggestions([`重点练习: ${wordsToPractice.join(', ')}`]);

        setTimeout(async () => {
          await speakText(`这一段基本读对了！我们特别注意一下这个词的发音。`, 'zh-CN');

          // 错词重练
          setTimeout(async () => {
            for (const word of wordsToPractice) {
              await speakText(`跟我读: ${word}`, 'zh-CN');
              setTeacherMsg(`请跟读: ${word}`);
              // 这里可以添加学生跟读的逻辑
              await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // 练习后显示下一题按钮
            await speakText("表现很好！准备进入下一段吧！", 'zh-CN');
            setTimeout(() => {
              setIsProcessing(false);
              setTeacherMsg("表现很好！准备进入下一段...");
              setShowNextButton(true);
            }, 1000);
          }, 1000);
        }, 500);
      });

    } else {
      // 路径C：需重点辅助 (准确度<60% 或 错词数 ≥ 4)
      if (!retryMode) {
        // 第一次失败 - 直接进入重试模式，提供重点练习单词
        setRetryMode(true);
        setWrongWords(extractedWrongWords);
        setFeedbackMessage(`这一段需要重点练习一些单词。`);

        setTimeout(async () => {
          await speakText(`这一段需要重点练习一些单词。`, 'zh-CN');
          setTeacherMsg(`请跟读这些重点单词，然后再试试这一段。`);
          setFeedbackMessage('');
        }, 500);

        setTimeout(() => {
          setIsProcessing(false);
        }, 1000);

      } else {
        // 第二次尝试 - 无论结果如何都推进
        setRetryMode(false);
        setFeedbackMessage("有进步！继续保持！");

        setTimeout(async () => {
          await speakText("有进步！继续保持！", 'zh-CN');
        }, 500);

        setTimeout(() => {
          setIsProcessing(false);
          setTeacherMsg("有进步！准备进入下一段...");
          setShowNextButton(true);
        }, 2000);
      }
    }
  };

  // 完成阅读的函数
  const completeReading = () => {
    setShowCelebration(true);
    setTeacherMsg("太了不起了，小科！你独立完成了整篇课文的朗读挑战！今天的复习任务，圆满成功！");

    setTimeout(async () => {
      await speakText("太了不起了，小科！你独立完成了整篇课文的朗读挑战！今天的复习任务，圆满成功！", 'zh-CN');
    }, 500);

    // 显示完成选项
    setTimeout(() => {
      setShowCompletionOptions(true);
    }, 3000);
  };

  // 重新开始
  const restartReading = () => {
    setCurrentSegIdx(-1);
    setReadingMode('overview');
    setWrongWords([]);
    setRetryMode(false);
    setCompletedSegments([]);
    setShowCelebration(false);
    setShowCompletionOptions(false);
    setShowNextButton(false);
    setTeacherMsg("真棒！再次挑战课文朗读吧！");

    setTimeout(async () => {
      await speakText("真棒！再次挑战课文朗读吧！", 'zh-CN');
    }, 500);
  };

  // 渲染带有重点词汇高亮的文本组件
  const HighlightedStoryText: React.FC<{ text: string; keyWords: string[] }> = ({ text, keyWords }) => {
    const words = text.split(/(\s+)/);

    return (
      <span>
        {words.map((word, index) => {
          const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
          const isKeyWord = keyWords.some(kw => kw.toLowerCase() === cleanWord);

          if (isKeyWord) {
            return (
              <span key={index} className="font-bold text-red-600">
                {word}
              </span>
            );
          }

          return <span key={index}>{word}</span>;
        })}
      </span>
    );
  };

  // 下一题处理函数
  const handleNextSegment = () => {
    if (currentSegIdx < STORY_DATA.length - 1) {
      setCompletedSegments(prev => [...prev, currentSegIdx]);
      setCurrentSegIdx(prev => prev + 1);
      setTeacherMsg(`继续挑战下一段...`);
      setFeedbackMessage('');
      setLastRecording(null);
      setSuggestions([]);
      setWrongWords([]);
      setShowNextButton(false);
    } else {
      completeReading();
    }
  };

  // 完成复习
  const finishReview = () => {
    onComplete([]);
  };

  const renderOverview = () => (
    <div className="flex flex-col h-full p-6">
      <div className="flex-1 glass-card rounded-2xl p-6 overflow-y-auto mb-4 custom-scrollbar card-shadow">
        <h2 className="text-2xl font-bold text-center text-white mb-4 drop-shadow-2xl" style={{textShadow: '0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)'}}>Ugly Sunny</h2>
        {STORY_DATA.map(seg => (
          <p key={seg.id} className="text-gray-900 mb-4 leading-relaxed font-medium" style={{textShadow: '0 1px 2px rgba(255,255,255,0.5)'}}>
            <HighlightedStoryText text={seg.text} keyWords={keyWords} />
          </p>
        ))}
      </div>
      <button onClick={startSegmentedReading} className="w-full gradient-button text-white py-4 rounded-2xl font-bold text-xl">
        开始朗读挑战
      </button>
    </div>
  );

  const renderSegment = () => {
    const segment = STORY_DATA[currentSegIdx];
    return (
      <div className="flex flex-col flex-1 p-6 items-center">
        <div className="w-full glass-card p-6 rounded-3xl mb-6 min-h-[200px] flex flex-col items-center justify-center card-shadow relative">
          <p className="text-xl font-medium text-gray-900 leading-loose text-center mb-4" style={{textShadow: '0 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.5)'}}>
            {segment.text}
          </p>
          <button
            onClick={() => {
              if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(segment.text);
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
              wrongWords={wrongWords}
              expectedText={segment.text}
            />
          </div>
        )}

        {/* 错词重练界面 */}
        {wrongWords.length > 0 && (
          <div className="mb-6 w-full max-w-sm">
            <div className="glass-card p-4 rounded-2xl card-shadow">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles size={20} />
                重点练习
              </h3>
              <div className="space-y-3">
                {wrongWords.map((word, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                    <span className="text-xl font-bold text-white">{word}</span>
                    <button
                      onClick={() => {
                        if ('speechSynthesis' in window) {
                          const utterance = new SpeechSynthesisUtterance(word);
                          utterance.lang = 'en-US';
                          utterance.rate = 0.8;
                          window.speechSynthesis.speak(utterance);
                        }
                      }}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-full transition-colors"
                      title="播放单词发音"
                    >
                      <Volume2 size={16} className="text-blue-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <AudioButton
          onRecordStart={() => {
            // 用户开始录音时，停止所有正在播放的AI语音
            stopSpeaking();
          }}
          onRecordEnd={handleReadSegment}
          isProcessing={isProcessing}
          label="按住朗读"
          expectedText={segment.text}
          isWord={false}
          showFeedback={true}
        />

        {/* 下一题按钮 */}
        {showNextButton && (
          <div className="mt-6 text-center">
            <button
              onClick={handleNextSegment}
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
              跳过这个部分
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
        
        <div className="mt-6 text-sm text-gray-600">
          第 {currentSegIdx + 1} 部分，共 {STORY_DATA.length} 部分
        </div>
      </div>
    );
  };

  console.log('TextReading rendering with currentSegIdx:', currentSegIdx);

  return (
    <div className="h-full flex flex-col gradient-bg-text">
      {/* Feedback Animation */}
      {feedbackAnimation?.show && (
        <FeedbackAnimation
          type={feedbackAnimation.type}
          onComplete={() => setFeedbackAnimation(null)}
        />
      )}

      {/* 庆祝动画 */}
      <StarEffect show={showCelebration} />

      {/* 完成选项界面 */}
      {showCompletionOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 rounded-3xl max-w-sm w-full text-center card-shadow">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-4">挑战完成！</h2>
            <p className="text-gray-200 mb-6">你已经成功完成了整篇课文的朗读！</p>
            <div className="space-y-3">
              <button
                onClick={restartReading}
                className="w-full py-3 px-6 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl font-bold transition-colors"
              >
                再学一遍
              </button>
              <button
                onClick={finishReview}
                className="w-full py-3 px-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold transition-colors"
              >
                完成复习
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center p-4 glass-card z-10 rounded-b-2xl">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500">
          <ArrowLeft />
        </button>
        <span className="font-bold text-lg gradient-text-green ml-2">课文朗读</span>
      </div>

      {/* 只在概览阶段显示TeacherAvatar */}
      {currentSegIdx === -1 && (
        <div className="p-4 pb-0 flex-shrink-0">
          <TeacherAvatar message={teacherMsg} />
        </div>
      )}

      <div className="flex-1 min-h-0" onClick={handleUserInteraction}>
        <div className="h-full overflow-y-auto custom-scrollbar">
          {console.log('TextReading rendering currentSegIdx:', currentSegIdx)}
          {currentSegIdx === -1 ? renderOverview() : renderSegment()}
        </div>
      </div>
    </div>
  );
};

export default TextReading;
