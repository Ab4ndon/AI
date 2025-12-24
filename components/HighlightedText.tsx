import React from 'react';

interface HighlightedTextProps {
  text: string;
  wrongWords: string[];
  className?: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  wrongWords,
  className = ''
}) => {
  // 如果没有错词，直接返回原文本
  if (!wrongWords || wrongWords.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // 将文本按单词分割，保留标点符号
  const words = text.split(/(\s+|[.,!?;:])/).filter(word => word.length > 0);

  return (
    <span className={className}>
      {words.map((word, index) => {
        // 清理单词用于匹配（移除标点）
        const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '').trim();

        // 检查这个词是否是错词（不区分大小写）
        const isWrongWord = wrongWords.some(wrongWord =>
          wrongWord.toLowerCase().replace(/[.,!?;:]/g, '').trim() === cleanWord
        );

        if (isWrongWord) {
          return (
            <span
              key={index}
              className="bg-red-200 text-red-800 px-1 rounded font-semibold"
              title={`发音需要改进: ${cleanWord}`}
            >
              {word}
            </span>
          );
        }

        return <span key={index}>{word}</span>;
      })}
    </span>
  );
};

export default HighlightedText;
