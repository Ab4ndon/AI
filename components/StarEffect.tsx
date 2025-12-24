import React, { useEffect, useState } from 'react';

interface StarEffectProps {
  show: boolean;
  onComplete?: () => void;
}

const StarEffect: React.FC<StarEffectProps> = ({ show, onComplete }) => {
  const [stars, setStars] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);

  useEffect(() => {
    if (show) {
      // 生成随机星星位置
      const newStars = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5
      }));
      setStars(newStars);

      // 动画结束后清理
      const timer = setTimeout(() => {
        setStars([]);
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute animate-star-burst"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            animationDelay: `${star.delay}s`
          }}
        >
          <span className="text-4xl">⭐</span>
        </div>
      ))}
    </div>
  );
};

export default StarEffect;

