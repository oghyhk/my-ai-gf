import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const { theme, toggleTheme, bgImage, setBackground, removeBackground } = useTheme();
  const [tab, setTab] = useState('appearance');
  const [bgUploading, setBgUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState('');

  // User profile
  const [userMd, setUserMd] = useState('');
  const [userSaving, setUserSaving] = useState(false);

  // Agents
  const [agents, setAgents] = useState([]);
  const [editingAgent, setEditingAgent] = useState(null);
  const [agentForm, setAgentForm] = useState(null);
  const [agentSaving, setAgentSaving] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadAgents();
  }, []);

  const loadUserProfile = async () => {
    try {
      const res = await fetch('/api/agents/user/profile');
      const data = await res.json();
      setUserMd(data.content || '');
    } catch (e) { console.error(e); }
  };

  const saveUserProfile = async () => {
    setUserSaving(true);
    try {
      await fetch('/api/agents/user/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMd }),
      });
      alert('已保存');
    } catch (e) { alert('保存失败'); }
    finally { setUserSaving(false); }
  };

  const loadAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      setAgents(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadAgentDetail = async (id) => {
    try {
      const res = await fetch(`/api/agents/${id}`);
      const data = await res.json();
      setAgentForm({
        id: data.id,
        name: data.name || '',
        avatar_emoji: data.avatar_emoji || '🌸',
        personality_text: data.personality || '',
        age: data.age || '',
        background: data.background || '',
        personality_md: data.personality_md || '',
      });
      setEditingAgent(id);
    } catch (e) { console.error(e); }
  };

  const saveAgent = async () => {
    if (!agentForm) return;
    setAgentSaving(true);
    try {
      const url = agentForm.id && agents.find(a => a.id === agentForm.id)
        ? `/api/agents/${agentForm.id}` : '/api/agents';
      const method = agentForm.id && agents.find(a => a.id === agentForm.id) ? 'PUT' : 'POST';
      await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentForm),
      });
      await loadAgents();
      setEditingAgent(null);
      setAgentForm(null);
      alert('已保存');
    } catch (e) { alert('保存失败: ' + e.message); }
    finally { setAgentSaving(false); }
  };

  const deleteAgent = async (id) => {
    if (id === 'default') return alert('不能删除默认AI');
    if (!confirm('确定删除这个AI及其所有会话？')) return;
    try { await fetch(`/api/agents/${id}`, { method: 'DELETE' }); loadAgents(); }
    catch (e) { alert('删除失败'); }
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setBgUploading(true);
    try {
      const fd = new FormData(); fd.append('image', file);
      const r = await fetch('/api/moments/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.urls?.length > 0) setBackground(d.urls[0]);
    } catch (e) { console.error(e); }
    finally { setBgUploading(false); e.target.value = ''; }
  };

  const handleUpdate = async () => {
    setUpdating(true); setUpdateLog('');
    try {
      const r = await fetch('/api/agent/update', { method: 'POST' });
      const reader = r.body.getReader();
      const d = new TextDecoder(); let l = '';
      while (true) { const { done, value } = await reader.read(); if (done) break; l += d.decode(value, { stream: true }); setUpdateLog(l); }
    } catch (e) { setUpdateLog('Error: ' + e.message); }
    finally { setUpdating(false); window.location.reload(); }
  };

  const tabs = [
    { key: 'appearance', label: '外观' },
    { key: 'profile', label: '我的档案' },
    { key: 'agents', label: 'AI 管理' },
    { key: 'update', label: '更新' },
  ];

  const inputStyle = {
    background: 'var(--bg-input)', color: 'var(--text-primary)',
    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%',
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
      <div className="app-header">
        <h1 className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>设置</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 py-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
            style={tab === t.key ? { background: 'var(--primary)', color: '#FFF' } : { color: 'var(--text-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* APPEARANCE */}
        {tab === 'appearance' && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>深色模式</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{theme === 'dark' ? '当前：深色' : '当前：浅色'}</div></div>
                <button onClick={toggleTheme} className="w-14 h-7 rounded-full transition-colors relative" style={{ background: theme === 'dark' ? 'var(--primary)' : 'var(--border-strong)' }}>
                  <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center text-xs"
                    style={{ transform: theme === 'dark' ? 'translateX(28px)' : 'translateX(2px)' }}>{theme === 'dark' ? '🌙' : '☀️'}</div>
                </button>
              </div>
            </div>

            <div className="card p-4">
              <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>背景图片</div>
              {bgImage ? (
                <div className="flex items-center gap-3">
                  <img src={bgImage} alt="" className="w-20 h-12 object-cover rounded-lg border" style={{ borderColor: 'var(--border-default)' }} />
                  <div className="flex gap-2">
                    <button onClick={() => document.getElementById('bgFileInput').click()} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>更换</button>
                    <button onClick={removeBackground} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>移除</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => document.getElementById('bgFileInput').click()} disabled={bgUploading}
                  className="w-full py-3 rounded-lg text-sm border border-dashed transition-colors"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}>
                  {bgUploading ? '上传中...' : '📷 选择背景图片'}
                </button>
              )}
              <input id="bgFileInput" type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
            </div>
          </div>
        )}

        {/* USER PROFILE */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="card p-4">
              <h2 className="font-heading text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>我的用户档案 (USER.md)</h2>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                AI 会读取这个档案来了解你。你可以手动编辑，AI 也会在对话中自动更新。
              </p>
              <textarea
                value={userMd}
                onChange={e => setUserMd(e.target.value)}
                rows={15}
                className="w-full rounded-xl resize-none text-sm font-mono"
                style={{ ...inputStyle, lineHeight: 1.6 }}
              />
              <button onClick={saveUserProfile} disabled={userSaving} className="btn btn-primary w-full mt-3">
                {userSaving ? '保存中...' : '保存用户档案'}
              </button>
            </div>
          </div>
        )}

        {/* AGENTS */}
        {tab === 'agents' && (
          <div className="space-y-4">
            {editingAgent ? (
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-heading text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {editingAgent && agents.find(a => a.id === editingAgent) ? '编辑 AI' : '新建 AI'}
                  </h2>
                  <button onClick={() => { setEditingAgent(null); setAgentForm(null); }}
                    className="text-sm" style={{ color: 'var(--text-muted)' }}>取消</button>
                </div>
                {[
                  { k: 'name', l: '名字', type: 'text' },
                  { k: 'avatar_emoji', l: '头像 Emoji', type: 'text' },
                  { k: 'age', l: '年龄', type: 'text' },
                  { k: 'personality_text', l: '性格描述 (简短)', type: 'textarea', rows: 2 },
                  { k: 'background', l: '背景故事', type: 'textarea', rows: 2 },
                  { k: 'personality_md', l: '完整人格档案 (PERSONALITY.md)', type: 'textarea', rows: 8 },
                ].map(({ k, l, type, rows }) => (
                  <div key={k}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{l}</div>
                    {type === 'textarea' ? (
                      <textarea value={agentForm?.[k] || ''} onChange={e => setAgentForm(prev => ({ ...prev, [k]: e.target.value }))}
                        rows={rows} className="w-full rounded-xl resize-none text-sm font-mono"
                        style={{ ...inputStyle, lineHeight: 1.5 }} />
                    ) : (
                      <input value={agentForm?.[k] || ''} onChange={e => setAgentForm(prev => ({ ...prev, [k]: e.target.value }))}
                        style={inputStyle} />
                    )}
                  </div>
                ))}
                <button onClick={saveAgent} disabled={agentSaving} className="btn btn-primary w-full">
                  {agentSaving ? '保存中...' : '保存 AI'}
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => { setAgentForm({ id: '', name: '', avatar_emoji: '🌸', personality_text: '', age: '', background: '', personality_md: '' }); setEditingAgent('new'); }}
                  className="btn w-full border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
                  ＋ 创建新的 AI 伴侣
                </button>
                {agents.map(agent => (
                  <div key={agent.id} className="card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                      {agent.avatar_emoji || '🌸'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{agent.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{agent.session_count || 0} 个会话</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => loadAgentDetail(agent.id)} className="px-3 py-1 rounded-lg text-xs"
                        style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>编辑</button>
                      {agent.id !== 'default' && (
                        <button onClick={() => deleteAgent(agent.id)} className="px-3 py-1 rounded-lg text-xs"
                          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>删除</button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* UPDATE */}
        {tab === 'update' && (
          <div className="space-y-4">
            <div className="card p-4">
              <h2 className="font-heading text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>应用更新</h2>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>从 GitHub 获取最新代码并自动重新构建</p>
              <button onClick={handleUpdate} disabled={updating} className="btn btn-accent w-full">{updating ? '更新中...' : '🔄 检查并更新'}</button>
              {updateLog && (
                <pre className="mt-3 p-3 rounded-lg overflow-x-auto max-h-48 overflow-y-auto text-xs font-mono"
                  style={{ background: 'var(--bg-deep)', color: '#A3E635' }}>{updateLog}</pre>
              )}
            </div>
            <div className="card p-4">
              <h2 className="font-heading text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>关于</h2>
              <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                <p>AI Companion v1.2</p>
                <p>多 AI 伴侣管理 · 深色主题 · 自定义背景</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
