import React, { useEffect, useState } from 'react';
import { AppView } from '../types';
import TeacherAvatar from '../components/TeacherAvatar';
import { BookOpen, MessageCircle, Mic, Star, CheckCircle } from 'lucide-react';
import { USER_NAME } from '../constants';
import { speakText, stopSpeaking } from '../services/ttsService';

interface HomeProps {
  onChangeView: (view: AppView) => void;
  completedModules: string[];
  returningFromModule?: AppView | null;
  onGoToReport?: () => void;
}

const Home: React.FC<HomeProps> = ({ onChangeView, completedModules, returningFromModule, onGoToReport }) => {
  const [greeting, setGreeting] = useState(`${USER_NAME}，下课回来啦！我们一起巩固今天学的'Is it an umbrella?'吧！`);
  const [showSummary, setShowSummary] = useState(false);
  const [showModules, setShowModules] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: greeting, 1: summary, 2: modules
  const [userInteracted, setUserInteracted] = useState(false);
  const [pendingVoices, setPendingVoices] = useState<string[]>([]);
  const [voiceTimeouts, setVoiceTimeouts] = useState<NodeJS.Timeout[]>([]);

  // 用户交互检测
  const handleUserInteraction = () => {
    if (!userInteracted) {
      setUserInteracted(true);
      console.log('用户交互检测到，开始播放待处理语音');

      // 清除所有待处理的语音超时，避免重复播放
      voiceTimeouts.forEach(timeout => clearTimeout(timeout));
      setVoiceTimeouts([]);

      // 播放所有待播放的语音
      if (pendingVoices.length > 0) {
        playPendingVoices();
      }
    }
  };

  const playPendingVoices = async () => {
    // 首先停止任何正在播放的语音
    stopSpeaking();

    for (const voice of pendingVoices) {
      try {
        await speakText(voice, 'zh-CN');
        // 在语音之间添加短暂延迟
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.log('播放待处理语音失败:', error);
        // 如果是AI服务错误，给用户友好的提示
        if (error instanceof Error && (error.message.includes('AI语音服务') || error.message.includes('暂时不可用'))) {
          console.warn('AI语音服务不可用，用户将看到文字提示');
        }
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
        // 如果是AI服务错误，给用户友好的提示
        if (error instanceof Error && (error.message.includes('AI语音服务') || error.message.includes('暂时不可用'))) {
          console.warn('AI语音服务不可用，用户将看到文字提示');
        }
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

  // 初始化首页状态和语音
  useEffect(() => {
    // 重置所有状态
    setGreeting(`${USER_NAME}，下课回来啦！我们一起巩固今天学的'Is it an umbrella?'吧！`);
    setShowSummary(false);
    setShowModules(false);
    setCurrentStep(0);
    setUserInteracted(false);
    setPendingVoices([]);
    setVoiceTimeouts([]);

    const timeouts: NodeJS.Timeout[] = [];

    // 显示课程总结
    const timeout1 = setTimeout(() => {
      setShowSummary(true);
    }, 1000);

    // 显示模块入口
    const timeout2 = setTimeout(() => {
      setShowModules(true);
    }, 2000);

    // 根据返回的模块播放不同的语音
    if (returningFromModule === AppView.WORDS) {
      // 从单词巩固模块返回，播放句型巩固提示
      setGreeting(`${USER_NAME}，单词巩固完成得非常棒！现在让我们继续巩固句型吧！`);
      const timeout3 = setTimeout(() => {
        if (!userInteracted) { // 只在用户未交互时播放
          playVoiceWithFallback(`${USER_NAME}，单词巩固完成得非常棒！现在让我们继续巩固句型吧！`);
        }
      }, 500);
      timeouts.push(timeout3);
    } else if (returningFromModule === AppView.SENTENCES) {
      // 从句子巩固模块返回，播放课文朗读提示
      setGreeting(`${USER_NAME}，句子巩固完成得非常棒！现在让我们继续学习课文朗读吧！`);
      const timeout3 = setTimeout(() => {
        if (!userInteracted) { // 只在用户未交互时播放
          playVoiceWithFallback(`${USER_NAME}，句子巩固完成得非常棒！现在让我们继续学习课文朗读吧！`);
        }
      }, 500);
      timeouts.push(timeout3);
    } else if (returningFromModule === AppView.TEXT_COMPLETION || returningFromModule === 'TEXT_SUMMARY_COMPLETE') {
      // 从课文完成或总结页面结束学习返回，触发恭喜特效，然后跳转到报告页面
      const timeout3 = setTimeout(() => {
        if (onGoToReport) {
          onGoToReport();
        }
      }, 2000);
      timeouts.push(timeout3);
    } else {
      // 默认情况：首次进入首页或没有上下文，播放欢迎语音
      const timeout3 = setTimeout(() => {
        if (!userInteracted) { // 只在用户未交互时播放
          playVoiceWithFallback(`${USER_NAME}，下课回来啦！我们一起巩固今天学的'Is it an umbrella?'吧！`);
        }
      }, 500);
      timeouts.push(timeout3);
    }

    timeouts.push(timeout1, timeout2);
    setVoiceTimeouts(timeouts);

    // 清理函数 - 在组件卸载时停止所有语音和清除定时器
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      // 停止任何可能还在播放的语音
      stopSpeaking();
    };
  }, [returningFromModule]); // 添加returningFromModule依赖

  // 添加全局点击监听器来检测用户交互
  useEffect(() => {
    const handleGlobalClick = () => {
      handleUserInteraction();
      // 只监听一次
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };

    // 只有在未交互且组件已初始化状态后才添加监听器
    if (!userInteracted && greeting) {
      document.addEventListener('click', handleGlobalClick);
      document.addEventListener('touchstart', handleGlobalClick);
    }

    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [userInteracted, greeting]); // 添加greeting依赖，确保初始化完成后才添加监听器

  const modules = [
    { 
      id: 'words', 
      title: '单词巩固', 
      view: AppView.WORDS, 
      icon: <Star className="text-yellow-500" size={28} />,
      color: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700'
    },
    { 
      id: 'sentences', 
      title: '句型巩固', 
      view: AppView.SENTENCES, 
      icon: <MessageCircle className="text-blue-500" size={28} />,
      color: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    },
    { 
      id: 'text', 
      title: '课文朗读', 
      view: AppView.TEXT, 
      icon: <BookOpen className="text-green-500" size={28} />,
      color: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700'
    },
  ];

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-4 pt-8" onClick={handleUserInteraction}>
      {/* Teacher Section */}
      <div className="flex-shrink-0 mb-6 animate-slide-in">
        <TeacherAvatar message={greeting} isSpeaking={currentStep === 0 || currentStep === 1 || currentStep === 2} />

        {/* 语音提示 */}
        {pendingVoices.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-center animate-fade-in">
            <p className="text-sm text-blue-700 flex items-center justify-center gap-2">
              <span>🔊</span>
              <span>点击任意位置开始聆听AI教师的声音</span>
            </p>
          </div>
        )}
      </div>

      {/* Summary Card - Show after greeting */}
      {showSummary && (
        <div className="glass-card rounded-3xl p-5 mb-6 animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="gradient-text font-bold text-lg mb-3 flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <span>课堂小结</span>
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><span className="font-bold gradient-text">主题：</span> Is it an umbrella?</p>
            <p><span className="font-bold gradient-text">单词：</span> notebook, page, radio, umbrella, vase, window</p>
            <p><span className="font-bold gradient-text">句型：</span> Is it a/an...? Yes, it is./No, it isn't.</p>
            <p><span className="font-bold gradient-text">阅读：</span> The Cloud</p>
          </div>
        </div>
      )}

      {/* Modules List - Show after summary */}
      {showModules && (
        <div className="flex-1 space-y-4">
          <h3 className="gradient-text font-bold text-lg px-2 mb-3 animate-slide-in" style={{ animationDelay: '0.2s' }}>今日复习计划</h3>

          {modules.map((mod, index) => {
            const isDone = completedModules.includes(mod.view);
            const isNext = !isDone && (index === 0 || completedModules.includes(modules[index-1].view));
            // 如果单词巩固已完成，高亮句型巩固
            const isHighlighted = (mod.view === AppView.SENTENCES && completedModules.includes(AppView.WORDS) && !isDone) ||
                                  (mod.view === AppView.TEXT && completedModules.includes(AppView.SENTENCES) && !isDone);

            return (
              <button
                key={mod.id}
                onClick={() => onChangeView(mod.view)}
                className={`w-full relative group smooth-transition animate-slide-in touch-feedback ${
                  isNext ? 'scale-105' : isDone ? '' : isHighlighted ? 'scale-105 animate-pulse' : 'opacity-80'
                }`}
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className={`
                  glass-card glass-card-hover rounded-2xl p-4 flex items-center justify-between
                  ${isNext ? 'ring-4 ring-offset-2 ring-purple-200 animate-pulse-slow' : isHighlighted ? 'ring-4 ring-offset-2 ring-blue-200 animate-pulse' : ''}
                `}>
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-white to-gray-50 p-3 rounded-xl shadow-md">
                      {mod.icon}
                    </div>
                    <div className="text-left">
                      <h4 className={`font-bold text-lg ${mod.textColor}`}>{mod.title}</h4>
                      {isNext && <span className="text-xs gradient-text font-semibold animate-pulse">✨ 点击开始</span>}
                      {isDone && <span className="text-xs text-green-500 font-bold">✓ 已完成</span>}
                    </div>
                  </div>

                  {isDone ? (
                    <CheckCircle className="text-green-500 animate-float" size={32} />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-white to-gray-50 shadow-md ${mod.textColor}`}>
                      <Mic size={20} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Home;