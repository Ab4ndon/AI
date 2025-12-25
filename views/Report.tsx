import React, { useEffect } from 'react';
import { USER_NAME } from '../constants';
import TeacherAvatar from '../components/TeacherAvatar';
import { speakText } from '../services/ttsService';
import { Trophy, Clock, Target, RotateCcw, Share2 } from 'lucide-react';

interface Props {
  onRestart: () => void;
  onFinish: () => void;
  onShare?: () => void;
  showSharePoster?: boolean;
  onCloseShare?: () => void;
  stats: {
    wordsCompleted: number;
    sentencesCompleted: number;
    textCompleted: boolean;
    averageScore: number;
    totalTime: number;
    mistakes: string[];
  };
}

const Report: React.FC<Props> = ({ onRestart, onFinish, onShare, showSharePoster, onCloseShare, stats }) => {
  // 页面加载时播放恭喜语音
  useEffect(() => {
    let hasPlayed = false;
    let isPlaying = false;

    const playCongrats = async () => {
      if (hasPlayed || isPlaying) return; // 防止重复播放
      isPlaying = true;

      try {
        await speakText(`恭喜你${USER_NAME}，完成了今天的所有学习任务！来看看你今天的优秀表现吧！`, 'zh-CN');
        hasPlayed = true; // 只有成功播放后才标记为已播放
      } catch (error) {
        console.error('恭喜语音播放失败:', error);
        isPlaying = false; // 失败后重置播放状态，允许重试
      }
    };

    // 使用setTimeout避免React严格模式下的重复调用
    const timeoutId = setTimeout(() => {
      playCongrats();
    }, 100);

    // 返回cleanup函数
    return () => {
      clearTimeout(timeoutId);
      hasPlayed = true;
      isPlaying = false;
    };
  }, []); // 空依赖数组，确保只执行一次

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-blue-50 to-white overflow-y-auto relative">
      {/* 分享按钮 - 右上方 */}
      <button
        onClick={onShare}
        className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 z-10"
        title="分享报告"
      >
        <Share2 size={18} />
      </button>

      <div className="p-6 pb-0 flex justify-center">
        <TeacherAvatar message={`Amazing job ${USER_NAME}! You are a reading champion today!`} mood="excited" />
      </div>

      <div className="p-4 flex-1">
        <div className="bg-white rounded-3xl shadow-xl p-6 border-2 border-indigo-50 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-indigo-900">今日复习战报</h2>
            <p className="text-gray-400 text-sm">{new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="bg-orange-50 p-4 rounded-2xl flex flex-col items-center">
                <Clock className="text-orange-400 mb-2" />
                <span className="text-2xl font-bold text-indigo-900">{Math.round(stats.totalTime / 60)}m</span>
                <span className="text-xs text-gray-500">总时长</span>
             </div>
             <div className="bg-purple-50 p-4 rounded-2xl flex flex-col items-center">
                <Target className="text-purple-400 mb-2" />
                <span className="text-2xl font-bold text-indigo-900">{stats.averageScore.toFixed(0)}</span>
                <span className="text-xs text-gray-500">平均分数</span>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
               <span className="text-gray-600 font-bold">复习单词</span>
               <span className="text-indigo-600 font-bold">{stats.wordsCompleted} 个</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
               <span className="text-gray-600 font-bold">掌握句型</span>
               <span className="text-indigo-600 font-bold">{stats.sentencesCompleted} 组</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
               <span className="text-gray-600 font-bold">朗读课文</span>
               <span className="text-green-500 font-bold">{stats.textCompleted ? '完成' : '未完成'}</span>
             </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-100 rounded-2xl flex items-center gap-3">
             <Trophy className="text-yellow-600" size={32} />
             <div>
               <p className="font-bold text-yellow-800 text-sm">班级小榜样</p>
               <p className="text-yellow-900 text-xs">表现排名第 3 名，领先 20 位同学！</p>
             </div>
          </div>
        </div>

        {/* Tomorrow Preview */}
        <div className="bg-blue-600 text-white rounded-3xl p-6 shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
          <h3 className="font-bold text-lg mb-2">📅 明日预告: 绘本阅读</h3>
          <p className="text-blue-100 text-sm">The Story of Little Fox. A fun adventure awaits!</p>
        </div>

        <div className="flex gap-4 pb-8">
           <button onClick={onRestart} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
             <RotateCcw size={18} /> 再学一遍
           </button>
           <button onClick={async () => {
             try {
               await speakText('恭喜你完成了所有练习，我们下次再见！', 'zh-CN');
             } catch (error) {
               console.error('结束语音播放失败:', error);
             }
             onFinish();
           }} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
             结束复习
           </button>
        </div>
      </div>

      {/* 分享海报 */}
      {showSharePoster && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* 海报头部 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold mb-2">学习成果分享</h1>
              <p className="text-blue-100">{USER_NAME} 的精彩表现</p>
            </div>

            {/* 统计数据 */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-orange-50 p-4 rounded-2xl flex flex-col items-center">
                  <Clock className="text-orange-400 mb-2" size={24} />
                  <span className="text-2xl font-bold text-indigo-900 mb-1">
                    {Math.round(stats.totalTime / 60)}m
                  </span>
                  <span className="text-sm text-gray-500">总时长</span>
                </div>
                <div className="bg-purple-50 p-4 rounded-2xl flex flex-col items-center">
                  <Target className="text-purple-400 mb-2" size={24} />
                  <span className="text-2xl font-bold text-indigo-900 mb-1">
                    {stats.averageScore.toFixed(0)}
                  </span>
                  <span className="text-sm text-gray-500">平均分数</span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 font-bold">复习单词</span>
                  <span className="text-indigo-600 font-bold">{stats.wordsCompleted} 个</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 font-bold">掌握句型</span>
                  <span className="text-indigo-600 font-bold">{stats.sentencesCompleted} 组</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 font-bold">朗读课文</span>
                  <span className="text-green-500 font-bold">{stats.textCompleted ? '完成' : '未完成'}</span>
                </div>
              </div>

              {/* 鼓励话语 */}
              <div className="text-center">
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

            {/* 操作按钮 */}
            <div className="p-6 bg-gray-50">
              <div className="flex gap-4">
                <button
                  onClick={onCloseShare}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    // 保存为图片的逻辑
                    alert('保存为图片功能开发中...');
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  💾 保存为图片
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;