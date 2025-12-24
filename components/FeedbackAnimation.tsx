import React, { useEffect, useState } from 'react';
import { ThumbsUp, Zap } from 'lucide-react';

export type FeedbackType = 'thumbsUp' | 'keepTrying';

interface FeedbackAnimationProps {
  type: FeedbackType;
  onComplete?: () => void;
}

const FeedbackAnimation: React.FC<FeedbackAnimationProps> = ({ type, onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    // 进入动画
    const enterTimer = setTimeout(() => {
      setAnimationPhase('hold');
    }, 300);

    // 保持显示
    const holdTimer = setTimeout(() => {
      setAnimationPhase('exit');
    }, 2000);

    // 退出动画
    const exitTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2500);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  const getAnimationClasses = () => {
    switch (animationPhase) {
      case 'enter':
        return 'animate-bounce scale-0 opacity-0';
      case 'hold':
        return 'scale-100 opacity-100';
      case 'exit':
        return 'animate-bounce scale-0 opacity-0';
      default:
        return '';
    }
  };

  const renderContent = () => {
    if (type === 'thumbsUp') {
      return (
        <div className="flex flex-col items-center gap-2">
          <ThumbsUp
            size={80}
            className="text-green-500 drop-shadow-lg"
            fill="currentColor"
          />
          <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold text-lg shadow-lg">
            真棒！
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Zap
              size={60}
              className="text-orange-500 drop-shadow-lg animate-pulse"
            />
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-orange-400 rounded-full animate-ping"></div>
          </div>
          <div className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-lg shadow-lg">
            继续加油呀！
          </div>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className={`transition-all duration-500 ease-out transform ${getAnimationClasses()}`}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default FeedbackAnimation;
