import React from 'react';
import { USER_NAME } from '../constants';
import TeacherAvatar from '../components/TeacherAvatar';
import { Trophy, Clock, Target, RotateCcw, Share2 } from 'lucide-react';

interface Props {
  onRestart: () => void;
  stats: any;
}

const Report: React.FC<Props> = ({ onRestart, stats }) => {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-blue-50 to-white overflow-y-auto">
      <div className="p-6 pb-0 flex justify-center">
        <TeacherAvatar message={`Amazing job ${USER_NAME}! You are a reading champion today!`} mood="excited" />
      </div>

      <div className="p-4 flex-1">
        <div className="bg-white rounded-3xl shadow-xl p-6 border-2 border-indigo-50 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-indigo-900">今日复习战报</h2>
            <p className="text-gray-400 text-sm">Oct 24, 2023</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="bg-orange-50 p-4 rounded-2xl flex flex-col items-center">
                <Clock className="text-orange-400 mb-2" />
                <span className="text-2xl font-bold text-indigo-900">12m</span>
                <span className="text-xs text-gray-500">总时长</span>
             </div>
             <div className="bg-purple-50 p-4 rounded-2xl flex flex-col items-center">
                <Target className="text-purple-400 mb-2" />
                <span className="text-2xl font-bold text-indigo-900">95%</span>
                <span className="text-xs text-gray-500">准确率</span>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
               <span className="text-gray-600 font-bold">复习单词</span>
               <span className="text-indigo-600 font-bold">7 个</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
               <span className="text-gray-600 font-bold">掌握句型</span>
               <span className="text-indigo-600 font-bold">3 组</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
               <span className="text-gray-600 font-bold">朗读课文</span>
               <span className="text-green-500 font-bold">完成</span>
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
           <button onClick={onRestart} className="flex-1 bg-white border-2 border-indigo-100 text-indigo-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
             <RotateCcw size={18} /> 再学一遍
           </button>
           <button className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
             <Share2 size={18} /> 分享成就
           </button>
        </div>
      </div>
    </div>
  );
};

export default Report;