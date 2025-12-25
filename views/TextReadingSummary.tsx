import React from 'react';
import SharePoster from '../components/SharePoster';

interface SentenceResult {
  text: string;
  score: number;
  transcript: string;
  recording?: Blob;
}

interface Props {
  onBack: () => void;
  onRestart: () => void;
  onFinish: () => void;
  onShare: () => void;
  showSharePoster: boolean;
  onCloseShare: () => void;
  segmentResults?: SentenceResult[];
}

const TextReadingSummary: React.FC<Props> = ({
  onBack,
  onRestart,
  onFinish,
  onShare,
  showSharePoster,
  onCloseShare,
  segmentResults = []
}) => {
  console.log('TextReadingSummary 接收到的 segmentResults:', segmentResults);
  console.log('segmentResults 长度:', segmentResults.length);

  // 计算统计数据 - 基于唯一句子去重
  const uniqueSentences = new Map();
  segmentResults.forEach(item => {
    // 如果句子不存在或当前分数更高，则更新
    if (!uniqueSentences.has(item.text) || uniqueSentences.get(item.text).score < item.score) {
      uniqueSentences.set(item.text, item);
    }
  });
  const uniqueSentenceScores = Array.from(uniqueSentences.values());

  const totalSentences = uniqueSentenceScores.length;
  const averageScore = totalSentences > 0 ? uniqueSentenceScores.reduce((sum, item) => sum + item.score, 0) / totalSentences : 0;

  console.log('计算得到的统计数据:', {
    totalSentences,
    averageScore,
    excellentCount: uniqueSentenceScores.filter(item => item.score >= 80).length,
    goodCount: uniqueSentenceScores.filter(item => item.score >= 60 && item.score < 80).length,
    needsImprovementCount: uniqueSentenceScores.filter(item => item.score < 60).length
  });
  const excellentCount = uniqueSentenceScores.filter(item => item.score >= 80).length;
  const goodCount = uniqueSentenceScores.filter(item => item.score >= 60 && item.score < 80).length;
  const needsImprovementCount = uniqueSentenceScores.filter(item => item.score < 60).length;

  return (
    <div className="h-full flex flex-col gradient-bg-text">
      <div className="flex items-center p-4 glass-card z-10 rounded-b-2xl">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-bold text-lg gradient-text-green ml-2">课文朗读总结</span>
      </div>

      <div className="flex-1 min-h-0" style={{ padding: '2rem' }}>
        <div className="h-full overflow-y-auto custom-scrollbar">
          <div className="flex flex-col flex-1 p-4 relative">
            {/* 分享按钮 - 右上方 */}
            <button
              onClick={onShare}
              className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 z-10"
              title="分享报告"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>

            {/* 庆祝效果 */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">课文朗读总结</h2>
              <p className="text-gray-600">太棒了！你完成了整篇课文的朗读！</p>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {averageScore.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">平均分数</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {excellentCount}
                </div>
                <div className="text-sm text-gray-600">优秀句子</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
                <div className="text-3xl font-bold text-yellow-600 mb-1">
                  {goodCount}
                </div>
                <div className="text-sm text-gray-600">良好句子</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {needsImprovementCount}
                </div>
                <div className="text-sm text-gray-600">需要改进</div>
              </div>
            </div>

            {/* 句子详情列表 */}
            <div className="flex-1 overflow-hidden mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">朗读详情</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uniqueSentenceScores.map((item, index) => (
                  <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1">
                          <span className="font-semibold text-gray-900 text-sm block">{item.text}</span>
                          <span className="text-xs text-gray-600 block">"{item.transcript}"</span>
                        </div>
                        {item.recording && (
                          <button
                            onClick={() => {
                              // 播放录音
                              const audio = new Audio(URL.createObjectURL(item.recording!));
                              audio.play();
                            }}
                            className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-sm transition-colors"
                            title="播放录音"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-bold ml-3 ${
                        item.score >= 80
                          ? 'bg-green-500 text-white'
                          : item.score >= 60
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {item.score}分
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-4">
              <button
                onClick={onRestart}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                再次练习
              </button>
              <button
                onClick={() => {
                  // 先回到主页面触发特效，然后跳转到总结页面
                  // 这里通过设置一个特殊的标志来让主页面知道是从总结页面返回的
                  window.history.replaceState({ fromTextSummary: true }, '');
                  onFinish();
                }}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                结束学习
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 分享海报 */}
      {showSharePoster && (
        <SharePoster
          type="text"
          scores={uniqueSentenceScores}
          averageScore={averageScore}
          excellentCount={excellentCount}
          goodCount={goodCount}
          needsImprovementCount={needsImprovementCount}
          totalItems={Math.max(totalSentences, 1)} // 至少显示1个项目
          userName="Mike"
          onBack={onCloseShare}
          onPlayRecording={(index) => {
            // 播放对应录音
            const recording = uniqueSentenceScores[index]?.recording;
            if (recording) {
              const audio = new Audio(URL.createObjectURL(recording));
              audio.play();
            }
          }}
          recordings={uniqueSentenceScores.map(item => item.recording).filter(Boolean) as Blob[]}
        />
      )}
    </div>
  );
};

export default TextReadingSummary;
