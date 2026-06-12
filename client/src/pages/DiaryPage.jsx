import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DiaryPage() {
  const navigate = useNavigate();
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newDiary, setNewDiary] = useState({ content: '', mood: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchDiaries(); }, []);

  const fetchDiaries = async () => {
    try { const res = await fetch('/api/diary'); if (res.ok) setDiaries(await res.json()); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDiary.content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/diary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newDiary) });
      if (res.ok) {
        const diary = await res.json();
        setDiaries(prev => [diary, ...prev]);
        setNewDiary({ content: '', mood: '' });
        setShowForm(false);
        setTimeout(async () => {
          try {
            const cr = await fetch(`/api/diary/${diary.id}/comment`, { method: 'POST' });
            if (cr.ok) { const u = await cr.json(); setDiaries(prev => prev.map(d => d.id === diary.id ? u : d)); }
          } catch {}
        }, 500);
      }
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  const moods = ['😊 开心', '😐 平静', '😔 低落', '😤 烦躁', '🤔 思考', '✨ 充实'];

  return (
    <div className="flex flex-col h-full">
      <div className="app-header" style={{ justifyContent: 'space-between' }}>
        <h1 className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>日记本</h1>
        <button onClick={() => setShowForm(!showForm)} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: 'var(--primary)', color: '#FFF' }}>{showForm ? '取消' : '写日记'}</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="card p-4 mb-4">
            <div className="mb-3">
              <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>今天的心情</div>
              <div className="flex flex-wrap gap-2">
                {moods.map(mood => (
                  <button key={mood} type="button" onClick={() => setNewDiary(prev => ({ ...prev, mood }))} className="px-3 py-1.5 rounded-full text-xs"
                    style={newDiary.mood === mood ? { background: 'var(--primary)', color: '#FFF' } : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                  >{mood}</button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <textarea value={newDiary.content} onChange={e => setNewDiary(prev => ({ ...prev, content: e.target.value }))} placeholder="记录今天的想法和感受..."
                className="w-full h-28 p-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
            </div>
            <button type="submit" disabled={submitting || !newDiary.content.trim()} className="btn btn-primary w-full">
              {submitting ? '保存中...' : '保存日记'}
            </button>
          </form>
        )}

        {loading ? <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>加载中...</div>
          : diaries.length === 0 ? <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>还没有日记，点击"写日记"开始记录吧</div>
          : diaries.map(diary => (
            <div key={diary.id} className="card p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(diary.created_at).toLocaleString('zh-CN')}</span>
                {diary.mood && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{diary.mood}</span>}
              </div>
              <p className="text-sm mb-3 whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{diary.content}</p>
              {diary.ai_comment && (
                <div className="rounded-lg p-3" style={{ background: 'var(--bg-input)', borderLeft: '3px solid var(--secondary)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{diary.ai_comment}</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--secondary)' }}>— 小悠的回复</p>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
