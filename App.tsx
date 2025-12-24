import React, { useState } from 'react';
import { AppView, AppState } from './types';
import Home from './views/Home';
import WordConsolidation from './views/WordConsolidation';
import SentenceConsolidation from './views/SentenceConsolidation';
import TextReading from './views/TextReading';
import Report from './views/Report';
import { stopSpeaking } from './services/ttsService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [sessionMistakes, setSessionMistakes] = useState<string[]>([]);

  const handleModuleComplete = (viewId: AppView, mistakes: string[]) => {
    setCompletedModules(prev => [...prev, viewId]);
    setSessionMistakes(prev => [...prev, ...mistakes]);

    // Check flow to determine next step or go home
    if (viewId === AppView.TEXT) {
      handleViewChange(AppView.REPORT);
    } else if (viewId === AppView.WORDS) {
      // 单词巩固完成后，直接跳转到句型巩固
      handleViewChange(AppView.SENTENCES);
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

    setView(newView);
  };

  const renderView = () => {
    switch (view) {
      case AppView.HOME:
        return <Home onChangeView={handleViewChange} completedModules={completedModules} />;
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
            onComplete={(mistakes) => handleModuleComplete(AppView.TEXT, mistakes)}
          />
        );
      case AppView.REPORT:
        return <Report onRestart={handleRestart} stats={{ mistakes: sessionMistakes }} />;
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