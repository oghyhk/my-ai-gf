import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function DiaryPage() {
  const navigate = useNavigate();
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newDiary, setNewDiary] = useState({ content: '', mood: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDiaries();
  }, []);

  const fetchDiaries = async () => {
    try {
      const res = await fetch('/api/diary');
      if (res.ok) {
        const data = await res.json();
        setDiaries(data);
      }
    } catch (error) {
      console.error('Failed to fetch diaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDiary.content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDiary),
      });

      if (res.ok) {
        const diary = await res.json();
        setDiaries([diary, ...diaries]);
        setNewDiary({ content: '', mood: '' });
        setShowForm(false);

        // Auto-request AI comment
        setTimeout(async () => {
          try {
            const commentRes = await fetch(`/api/diary/${diary.id}/comment`, {
              method: 'POST',
            });
            if (commentRes.ok) {
              const updated = await commentRes.json();
              setDiaries(prev => prev.map(d => d.id === diary.id ? updated : d));
            }
          } catch (err) {
            console.error('Failed to get AI comment:', err);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to create diary:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const moods = ['😊 开心', '😐 平静', '😔 低落', '😤 烦躁', '🤔 思考', '✨ 充实'];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/chat')} className="p-1 hover:bg-gray-100 rounded">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold flex-1">日记本</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
        >
          {showForm ? '取消' : '写日记'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">今天的心情</label>
              <div className="flex flex-wrap gap-2">
                {moods.map(mood => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setNewDiary(prev => ({ ...prev, mood }))}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      newDiary.mood === mood
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <textarea
                value={newDiary.content}
                onChange={(e) => setNewDiary(prev => ({ ...prev, content: e.target.value }))}
                placeholder="记录今天的想法和感受..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !newDiary.content.trim()}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting ? '保存中...' : '保存日记'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-8">加载中...</div>
        ) : diaries.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            还没有日记，点击上方"写日记"开始记录吧
          </div>
        ) : (
          <div className="space-y-4">
            {diaries.map(diary => (
              <div key={diary.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    {new Date(diary.created_at).toLocaleString('zh-CN')}
                  </span>
                  {diary.mood && (
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                      {diary.mood}
                    </span>
                  )}
                </div>
                <p className="text-gray-800 whitespace-pre-wrap mb-3">{diary.content}</p>
                {diary.ai_comment && (
                  <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                    <p className="text-sm text-blue-900">{diary.ai_comment}</p>
                    <p className="text-xs text-blue-600 mt-1">— 小悠的回复</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
