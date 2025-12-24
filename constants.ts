import { WordItem, SentenceItem, QuizItem, StorySegment } from './types';

export const USER_NAME = "Mike";
export const LESSON_TITLE = "Are you happy?";

// 单词数据 - 精心挑选的图片与单词含义准确对应
export const WORDS_DATA: WordItem[] = [
  // beautiful - 美丽的花朵，象征美丽和色彩
  { id: 'w1', word: 'beautiful', type: 'adj.', meaning: '美丽的', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=200&h=200&fit=crop&crop=center' },
  // ugly - 枯萎的植物，温和表示"不美丽"的概念
  { id: 'w2', word: 'ugly', type: 'adj.', meaning: '丑陋的', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop&crop=center' },
  // handsome - 英俊的男士，专业形象
  { id: 'w3', word: 'handsome', type: 'adj.', meaning: '英俊的', imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=center' },
  // tall - 高大的树木，直观展示高度
  { id: 'w4', word: 'tall', type: 'adj.', meaning: '高的', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop&crop=center' },
  // strong - 举重运动员，清晰展示力量和肌肉
  { id: 'w5', word: 'strong', type: 'adj.', meaning: '强壮的', imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center' },
  // happy - 开心的孩子笑脸，真实的快乐表情
  { id: 'w6', word: 'happy', type: 'adj.', meaning: '快乐的', imageUrl: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=200&h=200&fit=crop&crop=center' },
  // sad - 孩子低头沉思，温和的情感表达
  { id: 'w7', word: 'sad', type: 'adj.', meaning: '伤心的', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop&crop=center' },
];

export const SENTENCES_DATA: SentenceItem[] = [
  { id: 's1', text: "Is he handsome? No, he isn't!", group: 1 },
  { id: 's2', text: "Is he ugly? Yes, he is.", group: 1 },
  { id: 's3', text: "He's handsome! He's not ugly!", group: 2 },
  { id: 's4', text: "I'm handsome. I'm not ugly!", group: 2 },
  { id: 's5', text: "Are you happy? Yes, I am.", group: 3 },
  { id: 's6', text: "No, I'm not. I'm sad.", group: 3 },
];

export const GRAMMAR_CARDS = [
  { title: "", content: "He's/ I'm (not)...", desc: "说样子/心情" },
  { title: "", content: "Are you...?", sub: "Yes, I am.", desc: "问对方" },
  { title: "", content: "Is he/she...?", sub: "Yes/No...", desc: "问别人" },
];

export const QUIZ_DATA: QuizItem[] = [
  { id: 'q1', imageUrl: 'https://picsum.photos/seed/happyface/300/300', sentence: "I'm happy.", isCorrect: true },
  { id: 'q2', imageUrl: 'https://picsum.photos/seed/weak/300/300', sentence: "Are you strong? No, I'm not.", isCorrect: false }, // Intentionally tricky for demo
  { id: 'q3', imageUrl: 'https://picsum.photos/seed/handsomeguy/300/300', sentence: "He's handsome.", isCorrect: true },
  { id: 'q4', imageUrl: 'https://picsum.photos/seed/tallperson/300/300', sentence: "Is he tall? Yes, he is.", isCorrect: true },
];

export const STORY_DATA: StorySegment[] = [
  { id: 1, text: "Sunny is a baby duck. She lives on the water. She's very tall. Her brothers and sisters say, 'Sunny, you're ugly!'" },
  { id: 2, text: "Sunny's sad and she goes to the park." },
  { id: 3, text: "Sunny sees a cat. 'You're ugly!' says the cat." },
  { id: 4, text: "Sunny sees a dog. 'You're ugly!' says the dog." },
  { id: 5, text: "Sunny's sad. She looks for her brothers and sisters. Then Sunny sees a tall white swan on the water. 'You're fantastic!' says Sunny. 'But I'm ugly.' 'You're not ugly. Look!' says the swan." },
  { id: 6, text: "Sunny looks at the water. She's not a duck. She's a swan! Sunny feels very happy. 'I'm not ugly. I'm beautiful!' she says." }
];