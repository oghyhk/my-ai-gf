import { useState, useEffect, useRef } from 'react';
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
  const [userProfile, setUserProfile] = useState({ alias: '', bio: '', profile_pic: '' });
  const [userProfileSaving, setUserProfileSaving] = useState(false);
  const picInputRef = useRef(null);

  // Agents
  const [agents, setAgents] = useState([]);
  const [editingAgent, setEditingAgent] = useState(null);
  const [agentForm, setAgentForm] = useState(null);
  const [agentSaving, setAgentSaving] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadAgents();
    loadUserPageProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const res = await fetch('/api/agents/user/profile');
      setUserMd((await res.json()).content || '');
    } catch (e) { console.error(e); }
  };

  const loadUserPageProfile = async () => {
    try {
      const res = await fetch('/api/profiles/me');
      const d = await res.json();
      setUserProfile({ alias: d.alias || '', bio: d.bio || '', profile_pic: d.profile_pic || '' });
    } catch (e) { console.error(e); }
  };

  const saveUserPageProfile = async () => {
    setUserProfileSaving(true);
    try {
      await fetch('/api/profiles/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userProfile) });
      alert('已保存');
    } catch (e) { alert('保存失败'); }
    finally { setUserProfileSaving(false); }
  };

  const uploadUserPic = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('image', file);
    try {
      const r = await fetch('/api/profiles/upload-pic', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.url) setUserProfile(prev => ({ ...prev, profile_pic: d.url }));
    } catch (e) { console.error(e); }
    e.target.value = '';
  };

  const saveUserProfile = async () => {
    setUserSaving(true);
    try {
      await fetch('/api/agents/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: userMd }) });
      alert('已保存');
    } catch (e) { alert('保存失败'); }
    finally { setUserSaving(false); }
  };

  const loadAgents = async () => {
    try { setAgents(await (await fetch('/api/agents')).json()); } catch (e) { console.error(e); }
  };

  const loadAgentDetail = async (id) => {
    try {
      const d = await (await fetch(`/api/agents/${id}`)).json();
      setAgentForm({
        id: d.id, name: d.name || '', avatar_emoji: d.avatar_emoji || '🌸',
        alias: d.alias || '', bio: d.bio || '', profile_pic: d.profile_pic || '',
        personality_text: d.personality || '', age: d.age || '', background: d.background || '',
        personality_md: d.personality_md || '',
      });
      setEditingAgent(id);
    } catch (e) { console.error(e); }
  };

  const uploadAgentPic = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('image', file);
    try {
      const r = await fetch('/api/profiles/upload-pic', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.url) setAgentForm(prev => ({ ...prev, profile_pic: d.url }));
    } catch (e) { console.error(e); }
    e.target.value = '';
  };

  const saveAgent = async () => {
    if (!agentForm) return;
    setAgentSaving(true);
    try {
      const url = agentForm.id && agents.find(a => a.id === agentForm.id) ? `/api/agents/${agentForm.id}` : '/api/agents';
      const method = agentForm.id && agents.find(a => a.id === agentForm.id) ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(agentForm) });
      await loadAgents();
      setEditingAgent(null); setAgentForm(null);
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
      const d = await (await fetch('/api/moments/upload', { method: 'POST', body: fd })).json();
      if (d.urls?.length > 0) setBackground(d.urls[0]);
    } catch (e) { console.error(e); }
    finally { setBgUploading(false); e.target.value = ''; }
  };

  const handleUpdate = async () => {
    setUpdating(true); setUpdateLog('');
    try {
      const r = await fetch('/api/agent/update', { method: 'POST' });
      const reader = r.body.getReader();
      const decoder = new TextDecoder(); let l = '';
      while (true) { const { done, value } = await reader.read(); if (done) break; l += decoder.decode(value, { stream: true }); setUpdateLog(l); }
    } catch (e) { setUpdateLog('Error: ' + e.message); }
    finally { setUpdating(false); window.location.reload(); }
  };

  const tabs = [
    { key: 'appearance', label: '外观' },
    { key: 'mypage', label: '我的主页' },
    { key: 'profile', label: '我的档案' },
    { key: 'agents', label: 'AI 管理' },
    { key: 'update', label: '更新' },
  ];

  const istyle = { background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%' };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
      <div className="app-header"><h1 className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>设置</h1></div>

      <div className="flex gap-1 px-4 py-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap"
            style={tab === t.key ? { background: 'var(--primary)', color: '#FFF' } : { color: 'var(--text-muted)' }}>{t.label}</button>
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
                <button onClick={toggleTheme} className="w-14 h-7 rounded-full relative" style={{ background: theme === 'dark' ? 'var(--primary)' : 'var(--border-strong)' }}>
                  <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-xs"
                    style={{ transform: theme === 'dark' ? 'translateX(28px)' : 'translateX(2px)' }}>{theme === 'dark' ? '🌙' : '☀️'}</div>
                </button>
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>背景图片</div>
              {bgImage ? (
                <div className="flex items-center gap-3">
                  <img src={bgImage} alt="" className="w-20 h-12 object-cover rounded-lg" />
                  <div className="flex gap-2">
                    <button onClick={() => document.getElementById('bgInput').click()} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>更换</button>
                    <button onClick={removeBackground} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>移除</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => document.getElementById('bgInput').click()} disabled={bgUploading}
                  className="w-full py-3 rounded-lg text-sm border border-dashed" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}>{bgUploading ? '上传中...' : '📷 选择背景图片'}</button>
              )}
              <input id="bgInput" type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
            </div>
          </div>
        )}

        {/* MY PERSONAL PAGE */}
        {tab === 'mypage' && (
          <div className="space-y-4">
            <div className="card p-4">
              <h2 className="font-heading text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>我的主页</h2>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>你的个人主页信息，展示在朋友圈和你自己的主页。</p>

              <div className="flex items-center gap-3 mb-4">
                {userProfile.profile_pic ? (
                  <img src={userProfile.profile_pic} alt="" className="w-16 h-16 rounded-full object-cover border-2" style={{ borderColor: 'var(--primary)' }} />
                ) : (
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>👤</div>
                )}
                <button onClick={() => picInputRef.current?.click()} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>更换头像</button>
                <input ref={picInputRef} type="file" accept="image/*" onChange={uploadUserPic} className="hidden" />
              </div>

              {[
                { k: 'alias', l: '昵称', ph: '你的显示名称' },
                { k: 'bio', l: '简介', ph: '一句话介绍自己', ta: true },
              ].map(({ k, l, ph, ta }) => (
                <div key={k} className="mb-3">
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{l}</div>
                  {ta
                    ? <textarea value={userProfile[k]} onChange={e => setUserProfile(prev => ({ ...prev, [k]: e.target.value }))} rows={2} placeholder={ph} style={{ ...istyle, resize: 'none' }} />
                    : <input value={userProfile[k]} onChange={e => setUserProfile(prev => ({ ...prev, [k]: e.target.value }))} placeholder={ph} style={istyle} />
                  }
                </div>
              ))}
              <button onClick={saveUserPageProfile} disabled={userProfileSaving} className="btn btn-primary w-full">{userProfileSaving ? '保存中...' : '保存主页'}</button>
            </div>
          </div>
        )}

        {/* MY PROFILE (USER.md) */}
        {tab === 'profile' && (
          <div className="card p-4">
            <h2 className="font-heading text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>我的档案 (USER.md)</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>AI 读取此档案了解你，可手动编辑或由 AI 自动更新。</p>
            <textarea value={userMd} onChange={e => setUserMd(e.target.value)} rows={12} className="w-full rounded-xl resize-none text-sm font-mono" style={{ ...istyle, lineHeight: 1.6 }} />
            <button onClick={saveUserProfile} disabled={userSaving} className="btn btn-primary w-full mt-3">{userSaving ? '保存中...' : '保存档案'}</button>
          </div>
        )}

        {/* AGENTS */}
        {tab === 'agents' && (
          <div className="space-y-4">
            {editingAgent ? (
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{editingAgent && agents.find(a => a.id === editingAgent) ? '编辑 AI' : '新建 AI'}</h2>
                  <button onClick={() => { setEditingAgent(null); setAgentForm(null); }} className="text-sm" style={{ color: 'var(--text-muted)' }}>取消</button>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  {agentForm?.profile_pic ? (
                    <img src={agentForm.profile_pic} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{agentForm?.avatar_emoji || '🌸'}</div>
                  )}
                  <button onClick={() => document.getElementById('agentPicInput').click()} className="px-3 py-1 rounded-lg text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>更换头像</button>
                  <input id="agentPicInput" type="file" accept="image/*" onChange={uploadAgentPic} className="hidden" />
                </div>

                {[
                  { k: 'name', l: '名字', ph: '' },
                  { k: 'avatar_emoji', l: '头像 Emoji', ph: '' },
                  { k: 'alias', l: '显示昵称', ph: '' },
                  { k: 'bio', l: '简介', ph: '一句话介绍', ta: true, r: 2 },
                  { k: 'age', l: '年龄', ph: '' },
                  { k: 'background', l: '背景故事', ph: '', ta: true, r: 2 },
                  { k: 'personality_text', l: '性格描述', ph: '', ta: true, r: 2 },
                  { k: 'personality_md', l: '完整人格档案', ph: '', ta: true, r: 6 },
                ].map(({ k, l, ph, ta, r }) => (
                  <div key={k}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{l}</div>
                    {ta
                      ? <textarea value={agentForm?.[k] || ''} onChange={e => setAgentForm(prev => ({ ...prev, [k]: e.target.value }))} rows={r || 2} className="w-full rounded-xl resize-none text-sm font-mono" style={{ ...istyle, lineHeight: 1.5 }} placeholder={ph} />
                      : <input value={agentForm?.[k] || ''} onChange={e => setAgentForm(prev => ({ ...prev, [k]: e.target.value }))} placeholder={ph} style={istyle} />
                    }
                  </div>
                ))}
                <button onClick={saveAgent} disabled={agentSaving} className="btn btn-primary w-full">{agentSaving ? '保存中...' : '保存 AI'}</button>
              </div>
            ) : (
              <>
                <button onClick={() => { setAgentForm({ id: '', name: '', avatar_emoji: '🌸', alias: '', bio: '', profile_pic: '', personality_text: '', age: '', background: '', personality_md: '' }); setEditingAgent('new'); }}
                  className="btn w-full border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>＋ 创建新的 AI 伴侣</button>
                {agents.map(agent => (
                  <div key={agent.id} className="card p-4 flex items-center gap-3">
                    {agent.profile_pic
                      ? <img src={agent.profile_pic} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{agent.avatar_emoji || '🌸'}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{agent.alias || agent.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{agent.bio || agent.name}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => loadAgentDetail(agent.id)} className="px-3 py-1 rounded-lg text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>编辑</button>
                      {agent.id !== 'default' && (
                        <button onClick={() => deleteAgent(agent.id)} className="px-3 py-1 rounded-lg text-xs" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>删除</button>
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
              {updateLog && <pre className="mt-3 p-3 rounded-lg overflow-x-auto max-h-48 overflow-y-auto text-xs font-mono" style={{ background: 'var(--bg-deep)', color: '#A3E635' }}>{updateLog}</pre>}
            </div>
            <div className="card p-4">
              <h2 className="font-heading text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>关于</h2>
              <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}><p>AI Companion v1.3</p><p>多 AI 伴侣 · 个人主页 · 深色主题</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
