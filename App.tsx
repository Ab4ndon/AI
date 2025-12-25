import React, { useState } from 'react';
import { AppView, AppState, ReturningModuleType } from './types';
import Home from './views/Home';
import WordConsolidation from './views/WordConsolidation';
import SentenceConsolidation from './views/SentenceConsolidation';
import TextReading from './views/TextReading';
import TextReadingSummary from './views/TextReadingSummary';
import TextReadingCompletion from './views/TextReadingCompletion';
import Report from './views/Report';
import { stopSpeaking } from './services/ttsService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [sessionMistakes, setSessionMistakes] = useState<string[]>([]);
  const [returningFromModule, setReturningFromModule] = useState<ReturningModuleType>(null);
  const [showSharePoster, setShowSharePoster] = useState(false);
  const [segmentResults, setSegmentResults] = useState<{ text: string; score: number; transcript: string; recording?: Blob }[]>([]);

  // 学习统计数据
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [sentencesCompleted, setSentencesCompleted] = useState(0);
  const [textCompleted, setTextCompleted] = useState(false);
  const [sessionStartTime] = useState(Date.now());

  const handleModuleComplete = (viewId: AppView, mistakes: string[], additionalData?: any) => {
    setCompletedModules(prev => [...prev, viewId]);
    setSessionMistakes(prev => [...prev, ...mistakes]);

    // 更新统计数据
    if (viewId === AppView.WORDS) {
      // 这里可以从 additionalData 中获取单词完成数量
      setWordsCompleted(8); // 假设有8个单词
    } else if (viewId === AppView.SENTENCES) {
      // 这里可以从 additionalData 中获取句子完成数量
      setSentencesCompleted(3); // 假设有3组句子
    } else if (viewId === AppView.TEXT) {
      console.log('处理TEXT模块完成，additionalData:', additionalData);
      if (additionalData && additionalData.segmentResults) {
        console.log('设置segmentResults:', additionalData.segmentResults.length, '个结果');
        setSegmentResults(additionalData.segmentResults);
      } else {
        console.log('没有收到segmentResults数据');
      }
      setTextCompleted(true);
      handleViewChange(AppView.TEXT_SUMMARY);
      return; // 提前返回，不执行下面的逻辑
    }

    // Check flow to determine next step or go home
    if (viewId === AppView.WORDS) {
      // 单词巩固完成后，跳转到首页，句型巩固按钮会被高亮
      setReturningFromModule(AppView.WORDS);
      handleViewChange(AppView.HOME);
    } else if (viewId === AppView.SENTENCES) {
      // 句子巩固完成后，跳转到首页，课文朗读按钮会被高亮
      setReturningFromModule(AppView.SENTENCES);
      handleViewChange(AppView.HOME);
    } else {
      handleViewChange(AppView.HOME);
    }
  };

  const handleRestart = () => {
    setCompletedModules([]);
    setSessionMistakes([]);
    handleViewChange(AppView.HOME);
  };

  const handleViewChange = (newView: AppView) => {
    // 切换页面前强制停止所有语音播放
    stopSpeaking();

    // 额外确保停止任何可能还在播放的音频
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    });

    // 停止Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 如果是从某个模块返回到首页，设置标志
    if (newView === AppView.HOME && view !== AppView.HOME) {
      if (view === AppView.WORDS) {
        setReturningFromModule(AppView.WORDS);
      } else if (view === AppView.SENTENCES) {
        setReturningFromModule(AppView.SENTENCES);
      } else if (view === AppView.TEXT_COMPLETION) {
        setReturningFromModule(AppView.TEXT_COMPLETION);
      } else if (view === AppView.TEXT_SUMMARY) {
        // 检查是否是从总结页面结束学习返回的
        const state = window.history.state;
        if (state && state.fromTextSummary) {
          setReturningFromModule('TEXT_SUMMARY_COMPLETE');
        } else {
          setReturningFromModule(AppView.TEXT_SUMMARY);
        }
      }
    }

    setView(newView);

    // 如果不是跳转到首页，重置returningFromModule状态
    if (newView !== AppView.HOME) {
      setReturningFromModule(null);
    }
  };

  const renderView = () => {
    switch (view) {
      case AppView.HOME:
        return <Home
          onChangeView={handleViewChange}
          completedModules={completedModules}
          returningFromModule={returningFromModule}
          onGoToReport={() => handleViewChange(AppView.REPORT)}
        />;
      case AppView.WORDS:
        return (
          <WordConsolidation
            onBack={() => handleViewChange(AppView.HOME)}
            onComplete={(mistakes) => handleModuleComplete(AppView.WORDS, mistakes)}
          />
        );
      case AppView.SENTENCES:
        return (
          <SentenceConsolidation
            onBack={() => handleViewChange(AppView.HOME)}
            onComplete={(mistakes) => handleModuleComplete(AppView.SENTENCES, mistakes)}
          />
        );
      case AppView.TEXT:
        return (
          <TextReading
            onBack={() => handleViewChange(AppView.HOME)}
            onComplete={(mistakes, additionalData) => handleModuleComplete(AppView.TEXT, mistakes, additionalData)}
          />
        );
      case AppView.TEXT_SUMMARY:
        return (
          <TextReadingSummary
            onBack={() => handleViewChange(AppView.HOME)}
            onRestart={() => handleViewChange(AppView.TEXT)}
            onFinish={() => handleViewChange(AppView.HOME)}
            onShare={() => setShowSharePoster(true)}
            showSharePoster={showSharePoster}
            onCloseShare={() => setShowSharePoster(false)}
            segmentResults={segmentResults}
          />
        );
      case AppView.TEXT_COMPLETION:
        return (
          <TextReadingCompletion
            onRestart={() => handleViewChange(AppView.TEXT)}
            onFinish={() => {
              // 设置从课文完成返回的标志，然后跳转到首页
              setReturningFromModule(AppView.TEXT_COMPLETION);
              handleViewChange(AppView.HOME);
            }}
            onShare={() => setShowSharePoster(true)}
            showSharePoster={showSharePoster}
            onCloseShare={() => setShowSharePoster(false)}
            segmentResults={segmentResults}
          />
        );
      case AppView.REPORT:
        // 计算平均分数
        const totalItems = wordsCompleted + sentencesCompleted + (textCompleted ? 1 : 0);
        const totalScore = segmentResults.reduce((sum, item) => sum + item.score, 0);
        const averageScore = totalItems > 0 ? (totalScore + (wordsCompleted * 85) + (sentencesCompleted * 85)) / (segmentResults.length + wordsCompleted + sentencesCompleted) : 0;

        return <Report
          onRestart={handleRestart}
          onFinish={() => handleViewChange(AppView.HOME)}
          onShare={() => setShowSharePoster(true)}
          showSharePoster={showSharePoster}
          onCloseShare={() => setShowSharePoster(false)}
          stats={{
            wordsCompleted,
            sentencesCompleted,
            textCompleted,
            averageScore,
            totalTime: (Date.now() - sessionStartTime) / 1000, // 转换为秒
            mistakes: sessionMistakes
          }}
        />;
      default:
        return <div>Not found</div>;
    }
  };

  return (
    <div className="w-full h-screen gradient-bg-primary overflow-hidden flex justify-center items-center p-4">
      <div className="w-full h-full max-w-sm glass-card rounded-3xl shadow-2xl overflow-y-auto relative">
        {renderView()}
      </div>
    </div>
  );
};

export default App;