import React from 'react';
import HighlightedText from './HighlightedText';

interface SpeechBubbleProps {
  message: string;
  score?: number;
  suggestions?: string[];
  className?: string;
  wrongWords?: string[];
  expectedText?: string;
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  message,
  score,
  suggestions = [],
  className = '',
  wrongWords = [],
  expectedText
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* 对话气泡 */}
      <div className="relative glass-card px-5 py-4 rounded-2xl rounded-tl-none max-w-sm mx-auto card-shadow" style={{boxShadow: '0 8px 32px rgba(102, 126, 234, 0.15), 0 4px 16px rgba(118, 75, 162, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
        {/* 气泡小三角 */}
        <div className="absolute -top-3 left-0 w-4 h-4 bg-white/20 border-l-2 border-t-2 border-white/30 transform rotate-45 backdrop-blur-20"></div>

        {/* 消息内容 */}
        <p className="text-white font-semibold text-base text-center leading-relaxed mb-2">
          {message}
        </p>

        {/* 期望文本显示（标红错词） */}
        {expectedText && wrongWords.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="text-xs font-bold text-white mb-2 flex items-center gap-1">
              <span>🔍</span>
              <span>需要注意的单词：</span>
            </div>
            <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
              <HighlightedText
                text={expectedText}
                wrongWords={wrongWords}
                className="text-sm text-white leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* 提升建议 */}
        {suggestions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="text-xs font-bold text-white mb-2 flex items-center gap-1">
              <span>💡</span>
              <span>提升建议：</span>
            </div>
            <ul className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="text-xs text-white/90 leading-relaxed flex items-start gap-2">
                  <span className="text-white/60 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeechBubble;

