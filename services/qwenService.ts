import { USER_NAME } from '../constants';

// DashScope API Key
const apiKey = import.meta.env.VITE_DASHSCOPE_API_KEY;

// 计算文本相似度的辅助函数
function calculateTextSimilarity(str1: string, str2: string): number {
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

// Netlify Functions API路径
const NETLIFY_FUNCTIONS_BASE = import.meta.env.DEV
  ? '/.netlify/functions'  // 开发环境
  : '/.netlify/functions'; // 生产环境

// DashScope API路径
const BASE_URL = import.meta.env.DEV
  ? '/api/dashscope/services/aigc/text-generation/generation'  // 开发环境使用代理
  : '/api/dashscope-tts'; // 生产环境使用EdgeOne函数代理

export const generateTeacherFeedback = async (
  context: string,
  studentInput: string,
  isCorrect: boolean
): Promise<string> => {
  if (!apiKey) {
    // 如果没有 API Key，使用备用响应
    if (isCorrect) return `Great job, ${USER_NAME}! You said that perfectly!`;
    return `Nice try, ${USER_NAME}. Let's try that one more time together!`;
  }

  try {
    const modelId = 'qwen-turbo'; // 使用 qwen-turbo 模型，快速响应
    const prompt = `
      You are Bella, a friendly, energetic, and encouraging English teacher for a 7-year-old boy named ${USER_NAME}.
      The student just attempted to say: "${context}".
      The student's performance was: ${isCorrect ? 'Correct/Good' : 'Needs Improvement'}.
      
      Give a very short (max 15 words) spoken response.
      If correct: Be enthusiastic and praise specifically.
      If incorrect: Be encouraging and gentle, suggesting to try again.
      Style: Fun, simple English, maybe 1-2 words of Chinese for support if needed.
    `;

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify({
        model: modelId,
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
          max_tokens: 50
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 解析 DashScope API 响应
    if (data.output && data.output.choices && data.output.choices.length > 0) {
      const content = data.output.choices[0].message?.content || data.output.choices[0].message?.text;
      return content || "Good job!";
    }
    
    // 兼容其他可能的响应格式
    if (data.output?.text) {
      return data.output.text;
    }
    
    return "Good job!";
  } catch (error) {
    console.error("Qwen API Error:", error);
    return isCorrect ? "Super!" : "Let's try again!";
  }
};

// 生成详细的朗读评价和建议（包含评分）
export const generateDetailedFeedback = async (
  expectedText: string,
  userTranscript: string,
  evaluationResult: any,
  isWord: boolean
): Promise<{
  message: string;
  score: number;
  suggestions: string[];
}> => {
  // 如果 evaluationResult 不存在，基于文本相似度计算评分
  let score = evaluationResult?.score;
  let isCorrect = evaluationResult?.isCorrect;
  
  if (score === undefined || score === null) {
    // 如果没有评分，计算文本相似度作为评分
    const cleanUser = userTranscript.toLowerCase().trim();
    const cleanExpected = expectedText.toLowerCase().trim();
    
    if (!cleanUser || cleanUser.length === 0) {
      // 如果没有识别到任何文本，给一个较低的分数
      score = 0;
      isCorrect = false;
    } else {
      // 简单的相似度计算
      const similarity = calculateTextSimilarity(cleanUser, cleanExpected);
      score = Math.round(similarity * 100);
      isCorrect = similarity >= (isWord ? 0.65 : 0.6);
    }
  }
  
  // 确保 score 在 0-100 范围内
  score = Math.max(0, Math.min(100, score));
  
  if (!apiKey) {
    // 如果没有 API Key，使用备用响应
    const suggestions: string[] = [];
    if (score < 60) {
      suggestions.push('注意每个音节的发音清晰度');
      suggestions.push('尝试放慢速度，确保每个音都发准确');
    } else if (score < 80) {
      suggestions.push('发音不错，继续练习会让它更完美');
      suggestions.push('注意音调的准确性');
    } else {
      suggestions.push('发音很棒！继续保持！');
    }
    
    return {
      message: isCorrect 
        ? `太棒了！你读得很好！得分：${score}分` 
        : `再试试看！当前得分：${score}分，继续加油！`,
      score,
      suggestions
    };
  }

  try {
    const modelId = 'qwen-turbo';
    const prompt = `
      你是一位友好的英语老师，正在指导一个7岁的小学生${USER_NAME}学习英语朗读。
      学生需要朗读的内容是："${expectedText}"
      学生的实际朗读是："${userTranscript}"
      测评得分：${score}分（满分100分）
      是否通过：${isCorrect ? '通过' : '需要改进'}

      请根据得分和朗读内容给出个性化的评价和建议：

      如果得分很高（90-100分）：表扬具体的优点，如发音清晰、语调自然等
      如果得分中等（60-89分）：指出进步之处，同时给出具体改进建议
      如果得分较低（0-59分）：鼓励为主，指出主要需要改进的地方

      请用中文给出：
      1. 一句个性化的鼓励性评价（15-25字），不要总是说"读得非常完美"
      2. 2-3条具体的提升建议（每条建议10-15字），每条建议内容要各不相同

      格式要求：
      评价：[你的个性化评价]
      建议1：[第一条建议]
      建议2：[第二条建议]
      建议3：[第三条建议，可选]

      重要：建议内容不能重复，重点关注不同的发音方面

      示例：
      评价：你的发音很清晰，节奏掌握得不错！
      建议1：注意单词间的连读
      建议2：尝试更有感情地朗读
    `;

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify({
        model: modelId,
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
          max_tokens: 200
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    let content = '';
    
    if (data.output && data.output.choices && data.output.choices.length > 0) {
      content = data.output.choices[0].message?.content || data.output.choices[0].message?.text || '';
    } else if (data.output?.text) {
      content = data.output.text;
    }
    
    // 解析AI返回的内容
    const suggestions: string[] = [];
    let message = `得分：${score}分`;
    
    if (content) {
      // 提取评价
      const messageMatch = content.match(/评价[：:]\s*(.+?)(?:\n|建议|$)/);
      if (messageMatch) {
        message = messageMatch[1].trim();
      }
      
      // 提取建议
      const suggestionMatches = content.matchAll(/建议\d+[：:]\s*(.+?)(?:\n|建议|$)/g);
      for (const match of suggestionMatches) {
        suggestions.push(match[1].trim());
      }
    }
    
    // 如果没有提取到建议，使用默认建议
    if (suggestions.length === 0) {
      if (score < 60) {
        suggestions.push('注意每个音节的发音清晰度');
        suggestions.push('尝试放慢速度，确保每个音都发准确');
        if (!isWord) {
          suggestions.push('注意单词之间的连读和停顿');
        }
      } else if (score < 80) {
        suggestions.push('发音不错，继续练习会让它更完美');
        suggestions.push('注意音调的准确性');
      } else {
        suggestions.push('发音很棒！继续保持！');
      }
    }
    
    return {
      message: message || (isCorrect ? `太棒了！得分：${score}分` : `再试试看！得分：${score}分`),
      score,
      suggestions: suggestions.slice(0, 3) // 最多3条建议
    };
  } catch (error) {
    console.error("Qwen API Error:", error);
    
    // 错误时返回默认建议
    const suggestions: string[] = [];
    if (score < 60) {
      suggestions.push('注意每个音节的发音清晰度');
      suggestions.push('尝试放慢速度，确保每个音都发准确');
    } else if (score < 80) {
      suggestions.push('发音不错，继续练习会让它更完美');
      suggestions.push('注意音调的准确性');
    } else {
      suggestions.push('发音很棒！继续保持！');
    }
    
    return {
      message: isCorrect ? `太棒了！得分：${score}分` : `再试试看！得分：${score}分`,
      score,
      suggestions
    };
  }
};

