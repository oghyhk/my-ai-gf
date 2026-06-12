import { useEffect, useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import * as api from '../api/client';

export default function SettingsPage() {
  const { theme, toggleTheme, bgImage, setBackground, removeBackground } = useTheme();
  const [personality, setPersonality] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState('');
  const [bgUploading, setBgUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [personalityData, statusData] = await Promise.all([
        api.getPersonality(),
        api.getAgentStatus(),
      ]);
      setPersonality(personalityData);
      setAgentStatus(statusData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updatePersonality(personality);
      alert('保存成功！');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateLog('');
    try {
      const response = await fetch('/api/agent/update', { method: 'POST' });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let log = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        log += decoder.decode(value, { stream: true });
        setUpdateLog(log);
      }
    } catch (error) {
      setUpdateLog(`Error: ${error.message}`);
    } finally {
      setUpdating(false);
      window.location.reload();
    }
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBgUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/moments/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.urls?.length > 0) {
        setBackground(data.urls[0]);
      }
    } catch (error) {
      console.error('Background upload failed:', error);
    } finally {
      setBgUploading(false);
      e.target.value = '';
    }
  };

  const emotionLabels = {
    happiness: '开心', sadness: '难过', anger: '生气', surprise: '惊讶',
    fear: '害怕', disgust: '厌恶', affection: '好感', curiosity: '好奇',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="app-header">
        <h1 className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Appearance */}
        <div className="card p-4">
          <h2 className="font-heading text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            外观
          </h2>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>深色模式</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {theme === 'dark' ? '当前：深色' : '当前：浅色'}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="relative w-14 h-7 rounded-full transition-colors"
              style={{ background: theme === 'dark' ? 'var(--primary)' : 'var(--border-strong)' }}
            >
              <div
                className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center"
                style={{ transform: theme === 'dark' ? 'translateX(28px)' : 'translateX(2px)' }}
              >
                <span className="text-xs">{theme === 'dark' ? '🌙' : '☀️'}</span>
              </div>
            </button>
          </div>

          {/* Background Image */}
          <div>
            <div className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>背景图片</div>
            {bgImage ? (
              <div className="flex items-center gap-3">
                <img src={bgImage} alt="background" className="w-20 h-12 object-cover rounded-lg border" style={{ borderColor: 'var(--border-default)' }} />
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-input border" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-strong)' }}>
                    更换
                  </button>
                  <button onClick={removeBackground} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>
                    移除
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={bgUploading}
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-dashed transition-colors"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}
              >
                {bgUploading ? '上传中...' : '📷 选择背景图片'}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
          </div>
        </div>

        {/* AI Status */}
        {agentStatus && (
          <div className="card p-4">
            <h2 className="font-heading text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              AI 状态
            </h2>
            <div className="mb-2">
              <span style={{ color: 'var(--text-secondary)' }}>名字: </span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{agentStatus.name}</span>
            </div>
            <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>情绪状态</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(agentStatus.emotions || {}).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs w-14" style={{ color: 'var(--text-muted)' }}>{emotionLabels[key] || key}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-strong)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(value * 100).toFixed(0)}%`,
                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                      }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right" style={{ color: 'var(--text-muted)' }}>{(value * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personality */}
        <div className="card p-4">
          <h2 className="font-heading text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            AI 人格设置
          </h2>
          {[
            { key: 'name', label: '名字', placeholder: '' },
            { key: 'age', label: '年龄', placeholder: '' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="mb-3">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
              <input
                type="text"
                value={personality?.[key] || ''}
                onChange={e => setPersonality({ ...personality, [key]: e.target.value })}
                className="input-field"
                placeholder={placeholder}
              />
            </div>
          ))}
          {[
            { key: 'personality', label: '人格描述', rows: 3, placeholder: '描述 AI 的性格特点、说话风格...' },
            { key: 'background', label: '背景故事', rows: 2, placeholder: 'AI 的背景故事...' },
          ].map(({ key, label, rows, placeholder }) => (
            <div key={key} className="mb-3">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
              <textarea
                value={personality?.[key] || ''}
                onChange={e => setPersonality({ ...personality, [key]: e.target.value })}
                rows={rows}
                className="input-field"
                style={{ borderRadius: 'var(--radius-md)', resize: 'none', height: 'auto' }}
                placeholder={placeholder}
              />
            </div>
          ))}
          <button onClick={handleSave} disabled={saving} className="btn btn-primary w-full">
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>

        {/* Update */}
        <div className="card p-4">
          <h2 className="font-heading text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            应用更新
          </h2>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            从 GitHub 获取最新代码并自动重新构建
          </p>
          <button onClick={handleUpdate} disabled={updating} className="btn btn-accent w-full mb-2">
            {updating ? '更新中...' : '🔄 检查并更新'}
          </button>
          {updateLog && (
            <pre className="p-3 rounded-lg overflow-x-auto max-h-48 overflow-y-auto text-xs font-mono" style={{ background: 'var(--bg-deep)', color: '#A3E635' }}>
              {updateLog}
            </pre>
          )}
        </div>

        {/* About */}
        <div className="card p-4">
          <h2 className="font-heading text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            关于
          </h2>
          <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
            <p>AI Companion v1.1</p>
            <p>深色主题 · 自定义背景</p>
            <p>基于 DeepSeek + Mimo · UI/UX Pro Max</p>
          </div>
        </div>

      </div>
    </div>
  );
}
