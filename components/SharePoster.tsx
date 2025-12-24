import React from 'react';
import { ArrowLeft, Share2, Play, Download } from 'lucide-react';

interface WordScore {
  word: string;
  score: number;
  transcript: string;
}

interface SentenceScore {
  sentence: string;
  score: number;
  transcript: string;
}

interface SharePosterProps {
  type: 'words' | 'sentences' | 'text';
  scores: WordScore[] | SentenceScore[];
  averageScore: number;
  excellentCount: number;
  goodCount: number;
  needsImprovementCount: number;
  totalItems: number;
  userName: string;
  onBack: () => void;
  onPlayRecording?: (index: number) => void;
  recordings?: Blob[];
}

const SharePoster: React.FC<SharePosterProps> = ({
  type,
  scores,
  averageScore,
  excellentCount,
  goodCount,
  needsImprovementCount,
  totalItems,
  userName,
  onBack,
  onPlayRecording,
  recordings = []
}) => {
  const getTitle = () => {
    switch (type) {
      case 'words': return '单词朗读成果';
      case 'sentences': return '句子朗读成果';
      case 'text': return '课文朗读成果';
      default: return '学习成果';
    }
  };

  const getItemType = () => {
    switch (type) {
      case 'words': return '单词';
      case 'sentences': return '句子';
      case 'text': return '段落';
      default: return '项目';
    }
  };

  const handleShare = async () => {
    try {
      // 这里可以实现分享逻辑，比如生成图片或链接
      if (navigator.share) {
        await navigator.share({
          title: `${userName}的${getTitle()}`,
          text: `我在Bella老师的英语学习中取得了${averageScore.toFixed(0)}分的好成绩！快来一起学习吧！`,
          url: window.location.href
        });
      } else {
        // 复制到剪贴板作为后备方案
        await navigator.clipboard.writeText(
          `${userName}在Bella老师的英语学习中取得了${averageScore.toFixed(0)}分的好成绩！快来一起学习吧！${window.location.href}`
        );
        alert('分享链接已复制到剪贴板！');
      }
    } catch (error) {
      console.error('分享失败:', error);
      alert('分享失败，请手动截图分享');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4">
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-10 bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-all"
      >
        <ArrowLeft size={24} />
      </button>

      {/* 分享按钮 */}
      <button
        onClick={handleShare}
        className="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-all"
      >
        <Share2 size={24} />
      </button>

      {/* 海报内容 */}
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2">{getTitle()}</h1>
          <p className="text-blue-100">{userName} 的精彩表现</p>
        </div>

        {/* 统计数据 */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {averageScore.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">平均分数</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {excellentCount}
              </div>
              <div className="text-sm text-gray-600">表现优秀</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-1">
                {goodCount}
              </div>
              <div className="text-sm text-gray-600">表现良好</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-600 mb-1">
                {needsImprovementCount}
              </div>
              <div className="text-sm text-gray-600">需要练习</div>
            </div>
          </div>

          {/* 详细成绩列表 */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">详细成绩</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {scores.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {item.word || item.sentence}
                    </div>
                    <div className="text-sm text-gray-600">
                      "{item.transcript}"
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      item.score >= 80
                        ? 'bg-green-500 text-white'
                        : item.score >= 60
                        ? 'bg-yellow-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      {item.score}分
                    </div>
                    {recordings[index] && onPlayRecording && (
                      <button
                        onClick={() => onPlayRecording(index)}
                        className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                      >
                        <Play size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 鼓励话语 */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 italic">
              "每一次练习都是进步，每一次分享都是鼓励！"
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Bella老师祝你学习进步！📚✨
            </p>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2"></div>
      </div>

      {/* 生成图片按钮 */}
      <div className="max-w-md mx-auto mt-4">
        <button
          onClick={() => {
            // 这里可以实现生成图片功能
            alert('正在生成分享图片...（功能开发中）');
          }}
          className="w-full bg-white/90 backdrop-blur-sm text-gray-800 py-3 px-6 rounded-2xl font-bold shadow-lg hover:bg-white transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Download size={20} />
          生成分享图片
        </button>
      </div>
    </div>
  );
};

export default SharePoster;
