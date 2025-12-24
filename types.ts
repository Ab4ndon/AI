export enum AppView {
  HOME = 'HOME',
  WORDS = 'WORDS',
  SENTENCES = 'SENTENCES',
  TEXT = 'TEXT',
  TEXT_SUMMARY = 'TEXT_SUMMARY',
  TEXT_COMPLETION = 'TEXT_COMPLETION',
  REPORT = 'REPORT'
}

export type ReturningModuleType = AppView | 'TEXT_SUMMARY_COMPLETE' | null;

export interface WordItem {
  id: string;
  word: string;
  phonetic?: string; // 音标
  type: string;
  meaning: string;
  audioUrl?: string; // In a real app, this would be a URL
  imageUrl: string;
}

export interface SentenceItem {
  id: string;
  text: string;
  group: number; // For grouping in display
}

export interface QuizItem {
  id: string;
  imageUrl: string;
  sentence: string;
  isCorrect: boolean;
  options?: string[]; // A, B选项
  correctAnswer?: string; // 正确答案 'A' 或 'B'
  questionType?: 'yesno' | 'choice'; // 题目类型
}

export interface StorySegment {
  id: number;
  text: string;
  audioUrl?: string;
}

export interface AppState {
  view: AppView;
  completedModules: string[];
  sessionStartTime: number;
  stats: {
    wordsMastered: number;
    sentencesMastered: number;
    storyRead: boolean;
    mistakes: string[]; // List of words/sentences struggled with
  };
}