import { useEffect, useState } from 'react';
import CreateMoment from '../components/CreateMoment';
import MomentCard from '../components/MomentCard';
import * as api from '../api/client';

export default function MomentsPage() {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMoments();
  }, []);

  const loadMoments = async () => {
    try {
      const data = await api.getMoments();
      setMoments(data);
    } catch (error) {
      console.error('Failed to load moments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (momentData) => {
    try {
      const newMoment = await api.createMoment(momentData.content, momentData.images);
      setMoments([newMoment, ...moments]);
    } catch (error) {
      console.error('Failed to create moment:', error);
      alert('发布失败，请重试');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条动态吗？')) return;
    try {
      await api.deleteMoment(id);
      setMoments(moments.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete moment:', error);
      alert('删除失败，请重试');
    }
  };

  return (
    <div className="flex flex-col h-full bg-wechat-bg">
      <div className="bg-white px-4 py-3 text-center font-medium text-gray-900 shadow-sm border-b border-gray-200">
        朋友圈
      </div>

      <div className="flex-1 overflow-y-auto moments-container">
        <CreateMoment onCreate={handleCreate} />

        {loading ? (
          <div className="text-center text-gray-400 mt-20">加载中...</div>
        ) : moments.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            还没有动态，分享第一条吧 📸
          </div>
        ) : (
          <div className="pb-4">
            {moments.map((moment) => (
              <MomentCard key={moment.id} moment={moment} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
