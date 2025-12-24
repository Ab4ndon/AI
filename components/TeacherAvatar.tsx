import React, { useEffect, useState } from 'react';

interface TeacherAvatarProps {
  message: string;
  isSpeaking?: boolean;
  mood?: 'happy' | 'waiting' | 'excited';
  className?: string;
}

const TeacherAvatar: React.FC<TeacherAvatarProps> = ({ 
  message, 
  isSpeaking = false, 
  mood = 'happy', 
  className = '' 
}) => {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  // 说话时的嘴部动画
  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        setMouthOpen(prev => !prev);
      }, 200);
      return () => clearInterval(interval);
    } else {
      setMouthOpen(false);
    }
  }, [isSpeaking]);

  // 眨眼动画（随机眨眼）
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4000 + Math.random() * 2000); // 4-6秒随机眨眼

    return () => clearInterval(blinkInterval);
  }, []);

  // 根据心情调整表情
  const getMoodStyle = () => {
    switch (mood) {
      case 'excited':
        return {
          eyeShape: 'w-5 h-5',
          eyeY: 'top-8',
          mouthShape: mouthOpen ? 'w-8 h-6 rounded-full' : 'w-7 h-4 rounded-full',
          mouthY: 'bottom-6',
          scale: 'scale-110',
          cheeks: true
        };
      case 'waiting':
        return {
          eyeShape: 'w-4 h-3',
          eyeY: 'top-9',
          mouthShape: 'w-5 h-1 rounded-full',
          mouthY: 'bottom-7',
          scale: 'scale-100',
          cheeks: false
        };
      default: // happy
        return {
          eyeShape: 'w-5 h-5',
          eyeY: 'top-8',
          mouthShape: mouthOpen ? 'w-7 h-5 rounded-full' : 'w-6 h-3 rounded-full',
          mouthY: 'bottom-6',
          scale: 'scale-105',
          cheeks: true
        };
    }
  };

  const moodStyle = getMoodStyle();

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* 精美卡通人物容器 */}
      <div className="relative w-40 h-40 mb-5 animate-float">
        {/* 外圈光晕 - 更精美的渐变 */}
        <div className={`absolute inset-0 bg-gradient-to-br from-purple-300 via-pink-300 to-blue-300 rounded-full border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center transform transition-all duration-500 ${isSpeaking ? moodStyle.scale : 'scale-100'}`}>
          {/* 内圈装饰 */}
          <div className="absolute inset-2 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
          
          {/* 脸部 - 更精致的渐变 */}
          <div className="w-32 h-32 bg-gradient-to-br from-orange-100 via-pink-50 to-yellow-50 rounded-full relative mt-1 shadow-inner">
            {/* 脸部高光 */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-16 h-12 bg-white/40 rounded-full blur-sm"></div>
            
            {/* 头发 - 更精美的设计 */}
            <div className="absolute -top-4 left-0 w-full h-16 bg-gradient-to-b from-amber-500 via-amber-400 to-amber-300 rounded-t-full shadow-lg">
              {/* 头发高光 */}
              <div className="absolute top-3 left-1/4 w-10 h-8 bg-amber-200 rounded-full opacity-60 blur-sm"></div>
              <div className="absolute top-2 right-1/4 w-8 h-6 bg-amber-200 rounded-full opacity-40 blur-sm"></div>
              {/* 刘海 */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-12 h-4 bg-amber-400 rounded-b-full"></div>
            </div>
            
            {/* 左眼 - 更大更可爱 */}
            <div 
              className={`absolute ${moodStyle.eyeY} left-8 ${moodStyle.eyeShape} transition-all duration-300`}
            >
              {isBlinking ? (
                <div className="w-full h-1 bg-amber-800 rounded-full"></div>
              ) : (
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-lg relative overflow-hidden">
                  {/* 眼球 */}
                  <div className="w-3 h-3 bg-gradient-to-br from-amber-900 to-amber-700 rounded-full relative">
                    {/* 眼睛高光 */}
                    <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                    <div className="absolute top-1 left-1.5 w-0.5 h-0.5 bg-white/80 rounded-full"></div>
                  </div>
                  {/* 眼睛阴影 */}
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-amber-200/30 to-transparent rounded-t-full"></div>
                </div>
              )}
            </div>
            
            {/* 右眼 */}
            <div 
              className={`absolute ${moodStyle.eyeY} right-8 ${moodStyle.eyeShape} transition-all duration-300`}
            >
              {isBlinking ? (
                <div className="w-full h-1 bg-amber-800 rounded-full"></div>
              ) : (
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-lg relative overflow-hidden">
                  {/* 眼球 */}
                  <div className="w-3 h-3 bg-gradient-to-br from-amber-900 to-amber-700 rounded-full relative">
                    {/* 眼睛高光 */}
                    <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                    <div className="absolute top-1 left-1.5 w-0.5 h-0.5 bg-white/80 rounded-full"></div>
                  </div>
                  {/* 眼睛阴影 */}
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-amber-200/30 to-transparent rounded-t-full"></div>
                </div>
              )}
            </div>
            
            {/* 眉毛 */}
            <div className="absolute top-6 left-6 w-6 h-1.5 bg-amber-700 rounded-full transform rotate-12"></div>
            <div className="absolute top-6 right-6 w-6 h-1.5 bg-amber-700 rounded-full transform -rotate-12"></div>
            
            {/* 脸颊（开心时显示） */}
            {moodStyle.cheeks && (
              <>
                <div className="absolute top-14 left-4 w-4 h-3 bg-gradient-to-br from-pink-300 to-pink-200 rounded-full opacity-70 shadow-sm"></div>
                <div className="absolute top-14 right-4 w-4 h-3 bg-gradient-to-br from-pink-300 to-pink-200 rounded-full opacity-70 shadow-sm"></div>
              </>
            )}
            
            {/* 嘴巴 - 更精致的形状 */}
            <div 
              className={`absolute ${moodStyle.mouthY} left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-red-400 to-pink-400 transition-all duration-200 ${moodStyle.mouthShape} shadow-md`}
            >
              {/* 嘴巴高光 */}
              {!mouthOpen && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-1 bg-white/50 rounded-full"></div>
              )}
            </div>
          </div>
        </div>
        
        {/* 装饰星星 - 更精美 */}
        <div className="absolute -right-2 top-1 text-3xl animate-bounce-slow filter drop-shadow-lg" style={{ animationDelay: '0s' }}>✨</div>
        <div className="absolute -left-2 bottom-2 text-2xl animate-bounce-slow filter drop-shadow-lg" style={{ animationDelay: '1.5s' }}>⭐</div>
        
        {/* 说话时的音波效果 - 更精美 */}
        {isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-44 h-44 border-3 border-purple-400/30 rounded-full animate-ping"></div>
            <div className="absolute w-40 h-40 border-3 border-pink-400/30 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
            <div className="absolute w-36 h-36 border-2 border-blue-400/20 rounded-full animate-ping" style={{ animationDelay: '0.6s' }}></div>
          </div>
        )}
      </div>

      {/* 精美对话气泡 */}
      <div className="relative glass-card px-7 py-5 rounded-3xl rounded-tl-lg shadow-2xl border-2 border-white/60 max-w-sm animate-slide-in transform transition-all duration-300 hover:scale-105 backdrop-blur-xl">
        {/* 气泡小尾巴 - 更圆润精美 */}
        <div className="absolute -top-4 left-10 w-8 h-8 bg-white border-2 border-white/60 transform rotate-45 backdrop-blur-xl rounded-tl-full shadow-lg"></div>
        
        {/* 消息内容 */}
        <div className="relative z-10">
          <p className="text-indigo-900 font-bold text-base text-center leading-relaxed">
            {message}
          </p>
        </div>
        
        {/* 气泡装饰 - 说话时的动画效果 */}
        {isSpeaking && (
          <div className="absolute bottom-3 right-5 flex gap-1.5">
            <div className="w-2 h-2 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full animate-pulse shadow-sm" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-gradient-to-br from-pink-400 to-blue-400 rounded-full animate-pulse shadow-sm" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full animate-pulse shadow-sm" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
        
        {/* 静态装饰 */}
        {!isSpeaking && (
          <div className="absolute top-3 right-5 text-sm opacity-25">💭</div>
        )}
      </div>
    </div>
  );
};

export default TeacherAvatar;
