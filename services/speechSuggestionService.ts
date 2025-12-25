// 发音建议服务，基于测评结果生成建议
import { EvaluationResult } from './speechEvaluationService';
import { USER_NAME } from '../constants';

export const generateSpeechSuggestions = async (
  evaluationResult: EvaluationResult,
  expectedText: string,
  isWord: boolean
): Promise<string[]> => {
  const suggestions: string[] = [];

  // 基于得分生成建议
  if (evaluationResult.score < 60) {
    if (isWord) {
      suggestions.push('注意每个音节的发音，特别是重音部分');
      suggestions.push('尝试放慢速度，清晰地发出每个音');
    } else {
      suggestions.push('注意单词之间的连读和停顿');
      suggestions.push('尝试更清晰地发音每个单词');
    }
  } else if (evaluationResult.score < 80) {
    if (isWord) {
      suggestions.push('发音已经很好了，继续练习会让它更完美');
      suggestions.push('注意音调的准确性');
    } else {
      suggestions.push('注意句子的语调和节奏');
      suggestions.push('保持流畅的同时确保每个词都清晰');
    }
  } else {
    suggestions.push('发音很棒！继续保持！');
    if (!isWord) {
      suggestions.push('可以尝试更自然的语调和节奏');
    }
  }

  // 如果有识别错误，给出具体建议
  if (!evaluationResult.isCorrect && evaluationResult.userTranscript) {
    const userWords = evaluationResult.userTranscript.split(/\s+/);
    const expectedWords = expectedText.split(/\s+/);
    
    if (userWords.length !== expectedWords.length) {
      suggestions.push(`注意单词数量，应该说出 ${expectedWords.length} 个单词`);
    }
    
    // 找出不匹配的单词
    const mismatchedWords: string[] = [];
    for (let i = 0; i < Math.min(userWords.length, expectedWords.length); i++) {
      if (userWords[i] !== expectedWords[i]) {
        mismatchedWords.push(`第 ${i + 1} 个单词应该是 "${expectedWords[i]}"`);
      }
    }
    
    if (mismatchedWords.length > 0 && mismatchedWords.length <= 3) {
      suggestions.push(...mismatchedWords);
    }
  }

  // 如果得分较低，尝试使用 AI 生成更详细的建议
  if (evaluationResult.score < 70 && import.meta.env.VITE_DASHSCOPE_API_KEY) {
    try {
      const apiKey = import.meta.env.VITE_DASHSCOPE_API_KEY;
      // 根据环境选择不同的API调用方式
      const getApiEndpoint = (): string => {
        if (import.meta.env.DEV) {
          // 开发环境使用Vite代理
          return '/api/dashscope/api/v1/services/aigc/text-generation/generation';
        } else {
          // 生产环境检查是否在EdgeOne上
          const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
          if (hostname.includes('edgeone.cool')) {
            // EdgeOne环境使用边缘函数代理
            return '/dashscope-tts';
          } else {
            // 其他生产环境直接调用DashScope（可能需要后端代理）
            return 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
          }
        }
      };

      const BASE_URL = getApiEndpoint();
      
      const prompt = `You are an English pronunciation teacher. A student tried to say "${expectedText}" but said "${evaluationResult.userTranscript}" instead. The score is ${evaluationResult.score}/100. Give 2-3 specific, encouraging pronunciation tips in Chinese (max 20 words each). Focus on what to improve.`;

      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // 只在直接调用DashScope API时添加Authorization头
      // EdgeOne边缘函数会从环境变量获取API密钥
      if (!BASE_URL.includes('/dashscope-tts')) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['X-DashScope-SSE'] = 'disable';
      }

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'qwen-turbo',
          input: {
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 100
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.output && data.output.choices && data.output.choices.length > 0) {
          const aiSuggestions = data.output.choices[0].message?.content || data.output.choices[0].message?.text;
          if (aiSuggestions) {
            // 解析 AI 返回的建议（可能是列表或段落）
            const lines = aiSuggestions.split('\n').filter(line => line.trim().length > 0);
            if (lines.length > 0) {
              // 替换基础建议，使用 AI 生成的更详细的建议
              suggestions.splice(0, suggestions.length, ...lines.slice(0, 3));
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
      // 如果 AI 生成失败，使用基础建议
    }
  }

  return suggestions.length > 0 ? suggestions : ['继续练习，你会越来越好的！'];
};

