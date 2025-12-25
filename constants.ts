import { WordItem, SentenceItem, QuizItem, StorySegment } from './types';

export const USER_NAME = "Mike";
export const LESSON_TITLE = "Is it an umbrella?";

// 单词数据 - 精心挑选的图片与单词含义准确对应
export const WORDS_DATA: WordItem[] = [
  // notebook - 笔记本，直观展示学习工具
  { id: 'w1', word: 'notebook', type: 'n.', meaning: '笔记本', imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=200&h=200&fit=crop&crop=center' },
  // page - 书页，展示阅读和书写
  { id: 'w2', word: 'page', type: 'n.', meaning: '页', imageUrl: 'https://aband0n.oss-cn-nanjing.aliyuncs.com/img/image-20251225023236341.png' },
  // radio - 收音机，经典的电子设备
  { id: 'w3', word: 'radio', type: 'n.', meaning: '收音机', imageUrl: 'https://aband0n.oss-cn-nanjing.aliyuncs.com/img/image-20251225023025887.png' },
  // umbrella - 雨伞，实用的雨天必备品
  { id: 'w4', word: 'umbrella', type: 'n.', meaning: '伞', imageUrl: 'https://aband0n.oss-cn-nanjing.aliyuncs.com/img/image-20251225022743920.png' },
  // vase - 花瓶，装饰家居的艺术品
  { id: 'w5', word: 'vase', type: 'n.', meaning: '花瓶', imageUrl: 'https://aband0n.oss-cn-nanjing.aliyuncs.com/img/image-20251225022923745.png' },
  // window - 窗户，建筑的重要组成部分
  { id: 'w6', word: 'window', type: 'n.', meaning: '窗户', imageUrl: 'https://aband0n.oss-cn-nanjing.aliyuncs.com/img/image-20251225023341322.png' },
  // pencil - 铅笔，学习和写作的必备工具
  { id: 'w7', word: 'pencil', type: 'n.', meaning: '铅笔', imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=200&h=200&fit=crop&crop=center' },
  // book - 书，知识的载体
  { id: 'w8', word: 'book', type: 'n.', meaning: '书', imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=200&fit=crop&crop=center' },
];

export const SENTENCES_DATA: SentenceItem[] = [
  { id: 's1', text: "Is it an umbrella? No, it isn't.", group: 1 },
  { id: 's2', text: "Is it a vase? Yes, it is.", group: 1 },
  { id: 's3', text: "This is an umbrella. It's not a vase!", group: 2 },
  { id: 's4', text: "I have an umbrella. I don't have a vase!", group: 2 },
  { id: 's5', text: "Do you see the umbrella? Yes, I do.", group: 3 },
  { id: 's6', text: "No, I don't. I see the vase.", group: 3 },
];

export const GRAMMAR_CARDS = [
  { title: "", content: "Is it a/an...?", sub: "Yes, it is./No, it isn't.", desc: "问物品" },
];

export const QUIZ_DATA: QuizItem[] = [
  // 第1题：苹果 - Is it _____ apple? A. an B. a 答案：A
  {
    id: 'q1',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop&crop=center',
    sentence: "Is it ___ apple?",
    isCorrect: true,
    options: ['an', 'a'],
    correctAnswer: 'A',
    questionType: 'choice'
  },
  // 第2题：书 - Is it _____ book? A. an B. a 答案：B
  {
    id: 'q2',
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=300&fit=crop&crop=center',
    sentence: "Is it __ book?",
    isCorrect: false,
    options: ['an', 'a'],
    correctAnswer: 'B',
    questionType: 'choice'
  },
  // 第3题：雨伞 - Is it an umbrella? A. Yes, it is. B. No, it isn't. 答案：A
  {
    id: 'q3',
    imageUrl: 'https://aband0n.oss-cn-nanjing.aliyuncs.com/img/image-20251225022743920.png',
    sentence: "Is it an umbrella?",
    isCorrect: true,
    options: ['Yes, it is.', 'No, it isn\'t.'],
    correctAnswer: 'A',
    questionType: 'choice'
  }
];

export const STORY_DATA: StorySegment[] = [
  { id: 1, text: "What is it? What is it? What can you see?" },
  { id: 2, text: "Is it an apple? Is it a tree?" },
  { id: 3, text: "Is it a pencil? Or is it a bee?" },
  { id: 4, text: "Yes, it's an apple. Yes, it's a tree." },
  { id: 5, text: "And it's a pencil, And it's a bee." },
  { id: 6, text: "I can see them all Flying over the sea." }
];