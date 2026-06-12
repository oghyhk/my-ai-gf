import { useEffect, useState } from 'react';
import CreateMoment from '../components/CreateMoment';
import MomentCard from '../components/MomentCard';
import * as api from '../api/client';

export default function MomentsPage() {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMoments(); }, []);

  const loadMoments = async () => {
    try { setMoments(await api.getMoments()); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async (momentData) => {
    try { setMoments([await api.createMoment(momentData.content, momentData.images), ...moments]); } catch (e) { alert('发布失败'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除？')) return;
    try { await api.deleteMoment(id); setMoments(prev => prev.filter(m => m.id !== id)); } catch (e) { alert('删除失败'); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="app-header"><h1 className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>朋友圈</h1></div>
      <div className="flex-1 overflow-y-auto p-4">
        <CreateMoment onCreate={handleCreate} />
        {loading ? <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>加载中...</div>
        : moments.length === 0 ? <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>还没有动态 📸</div>
        : moments.map(m => <MomentCard key={m.id} moment={m} onDelete={handleDelete} />)}
      </div>
    </div>
  );
}
