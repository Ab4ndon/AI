// 语音测评服务，比较用户发音和标准发音
import { SpeechRecognitionResult } from './speechRecognitionService';

export interface EvaluationResult {
  isCorrect: boolean;
  score: number; // 0-100
  accuracy: number; // 0-1
  feedback: string;
  userTranscript: string;
  expectedText: string;
}

// 计算两个字符串的相似度（使用Levenshtein距离）
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // 计算Levenshtein距离
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
}

// 检查单词是否匹配（考虑部分匹配）
function evaluateWord(userText: string, expectedWord: string): EvaluationResult {
  // 清理文本
  const cleanUserText = userText.toLowerCase().trim();
  const cleanExpectedWord = expectedWord.toLowerCase().trim();
  
  const similarity = calculateSimilarity(cleanUserText, cleanExpectedWord);
  const accuracy = similarity;
  const score = Math.round(accuracy * 100);
  const isCorrect = accuracy >= 0.65; // 降低阈值到65%，更宽松

  let feedback = '';
  if (isCorrect) {
    if (accuracy >= 0.95) {
      feedback = 'Perfect! Excellent pronunciation!';
    } else if (accuracy >= 0.85) {
      feedback = 'Great! Very good pronunciation!';
    } else {
      feedback = 'Good! Keep practicing!';
    }
  } else {
    if (accuracy >= 0.5) {
      feedback = `接近了！你发音的是"${userText}"，试试"${expectedWord}"。听听标准发音再试试！`;
    } else {
      feedback = `单词是"${expectedWord}"。听听标准发音，跟读练习吧！`;
    }
  }

  return {
    isCorrect,
    score,
    accuracy,
    feedback,
    userTranscript: userText,
    expectedText: expectedWord
  };
}

// 检查句子是否匹配（考虑单词顺序和部分匹配）
function evaluateSentence(userText: string, expectedSentence: string): EvaluationResult {
  // 清理文本：移除标点符号，统一空格
  const cleanUserText = userText.toLowerCase().trim().replace(/[.,!?;:]/g, '');
  const cleanExpectedText = expectedSentence.toLowerCase().trim().replace(/[.,!?;:]/g, '');
  
  const userWords = cleanUserText.split(/\s+/).filter(w => w.length > 0);
  const expectedWords = cleanExpectedText.split(/\s+/).filter(w => w.length > 0);

  // 计算单词级别的匹配（使用更宽松的阈值）
  let matchedWords = 0;
  let totalSimilarity = 0;
  const minLength = Math.min(userWords.length, expectedWords.length);
  const maxLength = Math.max(userWords.length, expectedWords.length);

  for (let i = 0; i < minLength; i++) {
    const similarity = calculateSimilarity(userWords[i] || '', expectedWords[i] || '');
    totalSimilarity += similarity;
    if (similarity >= 0.6) { // 降低阈值到60%
      matchedWords++;
    }
  }

  // 考虑整体相似度
  const overallSimilarity = calculateSimilarity(cleanUserText, cleanExpectedText);
  
  // 单词匹配率：考虑长度差异
  const wordMatchRatio = maxLength > 0 ? matchedWords / maxLength : 0;
  
  // 如果用户说的单词更多，可能是识别了额外的词，给予一定宽容
  const lengthBonus = userWords.length >= expectedWords.length * 0.8 ? 0.1 : 0;
  
  // 综合评分：整体相似度占70%，单词匹配占30%，加上长度奖励
  const accuracy = Math.min(1.0, overallSimilarity * 0.7 + wordMatchRatio * 0.3 + lengthBonus);
  const score = Math.round(accuracy * 100);
  const isCorrect = accuracy >= 0.6; // 降低阈值到60%

  let feedback = '';
  if (isCorrect) {
    if (accuracy >= 0.9) {
      feedback = 'Excellent! Perfect pronunciation!';
    } else if (accuracy >= 0.8) {
      feedback = 'Great job! Very good!';
    } else {
      feedback = 'Good! Keep practicing!';
    }
  } else {
    if (accuracy >= 0.4) {
      feedback = `Almost there! You said "${userText}", but try "${expectedSentence}". Listen and try again!`;
    } else {
      feedback = `Not quite right. The sentence is "${expectedSentence}". Listen carefully and try again!`;
    }
  }

  return {
    isCorrect,
    score,
    accuracy,
    feedback,
    userTranscript: userText,
    expectedText: expectedSentence
  };
}

// 检查是否为"没有识别到语音"的情况
function isNoSpeechDetected(userTranscript: string): boolean {
  return !userTranscript || userTranscript.trim().length === 0;
}

// 导出测评函数
export const evaluateSpeech = (
  userTranscript: string,
  expectedText: string,
  isWord: boolean = true
): EvaluationResult => {
  // 特殊处理：没有识别到语音的情况
  if (isNoSpeechDetected(userTranscript)) {
    return {
      isCorrect: false,
      score: 0,
      accuracy: 0,
      feedback: `没有听到你的声音哦！

试试大声说出来吧！🎤
目标内容：${expectedText}`,
      userTranscript: '',
      expectedText: expectedText
    };
  }

  if (isWord) {
    return evaluateWord(userTranscript, expectedText);
  } else {
    return evaluateSentence(userTranscript, expectedText);
  }
};

