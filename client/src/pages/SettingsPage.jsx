import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../i18n';

export default function SettingsPage() {
  const { t, lang, switchLang } = useT();
  const { theme, toggleTheme, bgImage, setBackground, removeBackground } = useTheme();
  const [tab, setTab] = useState('appearance');
  const [bgUploading, setBgUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState('');
  const picInputRef = useRef(null);
  const bgInputRef = useRef(null);

  const [userProfile, setUserProfile] = useState({ alias: '', bio: '', profile_pic: '' });
  const [userProfileSaving, setUserProfileSaving] = useState(false);

  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [agentForm, setAgentForm] = useState(null);
  const [agentSaving, setAgentSaving] = useState(false);
  const [agentTab, setAgentTab] = useState('profile');
  const [memories, setMemories] = useState([]);

  useEffect(() => { loadUserProfile(); loadAgents(); }, []);

  const loadUserProfile = async () => {
    try { setUserProfile(await (await fetch('/api/profiles/me')).json() || {}); } catch (e) {}
  };
  const loadAgents = async () => {
    try {
      const list = await (await fetch('/api/agents')).json();
      setAgents(list);
      if (list.length > 0 && !selectedAgentId) loadAgentForEdit(list[0].id);
    } catch (e) {}
  };
  const loadAgentDetail = async (id) => {
    try {
      const d = await (await fetch(`/api/agents/${id}`)).json();
      setAgentForm({
        id: d.id, name: d.name || '', avatar_emoji: d.avatar_emoji || '🌸',
        alias: d.alias || '', bio: d.bio || '', profile_pic: d.profile_pic || '',
        personality_text: d.personality || '', age: d.age || '', background: d.background || '',
        personality_md: d.personality_md || '', user_md: d.user_md || '',
      });
    } catch (e) {}
  };
  const loadAgentForEdit = async (id) => {
    setSelectedAgentId(id);
    await loadAgentDetail(id);
    try { setMemories(await (await fetch(`/api/agents/${id}/memories`)).json()); } catch (e) {}
  };

  const uploadPic = async (e, setFn, field) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('image', file);
    try { const r = await (await fetch('/api/profiles/upload-pic', { method: 'POST', body: fd })).json(); if (r.url) setFn(prev => ({ ...prev, [field]: r.url })); } catch (err) {}
    e.target.value = '';
  };

  const saveUserPage = async () => {
    setUserProfileSaving(true);
    try { await fetch('/api/profiles/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userProfile) }); alert(t('settings.saved')); } catch (e) { alert(t('settings.saveFail')); } finally { setUserProfileSaving(false); }
  };

  const saveAgent = async () => {
    if (!agentForm) return; setAgentSaving(true);
    try {
      const method = agentForm.id && agents.find(a => a.id === agentForm.id) ? 'PUT' : 'POST';
      const url = agentForm.id && agents.find(a => a.id === agentForm.id) ? `/api/agents/${agentForm.id}` : '/api/agents';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(agentForm) });
      await loadAgents();
      if (agentForm.id) await loadAgentDetail(agentForm.id);
      alert(t('settings.saved'));
    } catch (e) { alert(t('settings.saveFail')); } finally { setAgentSaving(false); }
  };

  const deleteAgent = async (id) => {
    if (id === 'default') return alert(t('settings.cannotDelete'));
    if (!confirm(t('settings.confirmDelete'))) return;
    try { await fetch(`/api/agents/${id}`, { method: 'DELETE' }); setSelectedAgentId(null); setAgentForm(null); loadAgents(); } catch (e) { alert(t('settings.deleteFail')); }
  };

  const deleteMemoryFragment = async (memId) => {
    try { await fetch(`/api/agents/${selectedAgentId}/memories/${memId}`, { method: 'DELETE' }); setMemories(prev => prev.filter(m => m.id !== memId)); } catch (e) {}
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setBgUploading(true);
    try { const d = await (await fetch('/api/moments/upload', { method: 'POST', body: (() => { const fd = new FormData(); fd.append('image', file); return fd; })() })).json(); if (d.urls?.[0]) setBackground(d.urls[0]); } catch (er) {} finally { setBgUploading(false); e.target.value = ''; }
  };

  const handleUpdate = async () => {
    setUpdating(true); setUpdateLog('Fetching...');
    try { const r = await fetch('/api/agent/update', { method: 'POST' }); const d = await r.text(); setUpdateLog(d); } catch (er) { setUpdateLog('Error: ' + er.message); } finally { setUpdating(false); setTimeout(() => window.location.reload(), 2000); }
  };

  const tabs = [
    { key: 'appearance', label: t('settings.appearance') },
    { key: 'mypage', label: t('settings.myPage') },
    { key: 'agents', label: t('settings.agents') },
    { key: 'update', label: t('settings.update') },
  ];

  const istyle = { background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%' };
  const card = { background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px' };
  const h3style = { color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 };
  const muted = { color: 'var(--text-muted)', fontSize: '12px' };
  const btnStyle = (active) => ({ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none', background: active ? 'var(--primary)' : 'var(--bg-input)', color: active ? '#FFF' : 'var(--text-secondary)' });

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
      <div className="app-header"><h1 className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('settings.title')}</h1></div>
      <div className="flex gap-1 px-4 py-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(ti => (
          <button key={ti.key} onClick={() => setTab(ti.key)} className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap"
            style={tab === ti.key ? { background: 'var(--primary)', color: '#FFF' } : { color: 'var(--text-muted)' }}>{ti.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* APPEARANCE */}
        {tab === 'appearance' && (
          <div className="space-y-4">
            <div style={card}>
              <div className="flex items-center justify-between">
                <div><div style={h3style}>{t('settings.darkMode')}</div><div style={muted}>{theme === 'dark' ? t('settings.darkModeOn') : t('settings.darkModeOff')}</div></div>
                <button onClick={toggleTheme} className="w-14 h-7 rounded-full relative" style={{ background: theme === 'dark' ? 'var(--primary)' : 'var(--border-strong)' }}>
                  <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-xs" style={{ transform: theme === 'dark' ? 'translateX(28px)' : 'translateX(2px)' }}>{theme === 'dark' ? '🌙' : '☀️'}</div>
                </button>
              </div>
            </div>
            <div style={card}>
              <div className="flex items-center justify-between">
                <div style={h3style}>{t('settings.language')}</div>
                <div className="flex gap-2">
                  <button onClick={() => switchLang('zh')} style={btnStyle(lang === 'zh')}>{t('settings.languageZh')}</button>
                  <button onClick={() => switchLang('en')} style={btnStyle(lang === 'en')}>{t('settings.languageEn')}</button>
                </div>
              </div>
            </div>
            <div style={card}>
              <div style={{ ...h3style, marginBottom: 8 }}>{t('settings.bgImage')}</div>
              {bgImage ? (
                <div className="flex items-center gap-3"><img src={bgImage} alt="" className="w-20 h-12 object-cover rounded-lg" />
                  <button onClick={() => bgInputRef.current?.click()} style={btnStyle(false)}>{t('settings.change')}</button>
                  <button onClick={removeBackground} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>{t('settings.remove')}</button>
                </div>
              ) : (
                <button onClick={() => bgInputRef.current?.click()} disabled={bgUploading} className="w-full py-3 rounded-lg text-sm border border-dashed" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}>{bgUploading ? t('settings.upload') : t('settings.selectBg')}</button>
              )}
              <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
            </div>
          </div>
        )}

        {/* MY PAGE */}
        {tab === 'mypage' && (
          <div style={card}>
            <h2 style={{ ...h3style, marginBottom: 12 }}>{t('settings.myPage')}</h2>
            <div className="flex items-center gap-3 mb-3">
              {userProfile.profile_pic ? <img src={userProfile.profile_pic} alt="" className="w-16 h-16 rounded-full object-cover border-2" style={{ borderColor: 'var(--primary)' }} /> : <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>👤</div>}
              <button onClick={() => picInputRef.current?.click()} style={btnStyle(false)}>{t('settings.changeAvatar')}</button>
              <input ref={picInputRef} type="file" accept="image/*" onChange={(e) => uploadPic(e, setUserProfile, 'profile_pic')} className="hidden" />
            </div>
            {[{ k: 'alias', l: t('settings.alias'), ph: t('settings.aliasPh') }, { k: 'bio', l: t('settings.bio'), ph: t('settings.bioPh'), ta: true }].map(({ k, l, ph, ta }) => (
              <div key={k} className="mb-3"><div style={muted}>{l}</div>
                {ta ? <textarea value={userProfile[k] || ''} onChange={e => setUserProfile(prev => ({ ...prev, [k]: e.target.value }))} rows={2} placeholder={ph} style={{ ...istyle, resize: 'none' }} />
                  : <input value={userProfile[k] || ''} onChange={e => setUserProfile(prev => ({ ...prev, [k]: e.target.value }))} placeholder={ph} style={istyle} />}
              </div>
            ))}
            <button onClick={saveUserPage} disabled={userProfileSaving} className="btn btn-primary w-full">{userProfileSaving ? t('settings.saving') : t('settings.savePage')}</button>
          </div>
        )}

        {/* AGENTS */}
        {tab === 'agents' && (
          <div className="flex gap-3" style={{ minHeight: '60vh' }}>
            {/* Agent list sidebar */}
            <div className="w-36 flex-shrink-0 space-y-1">
              {agents.map(a => (
                <button key={a.id} onClick={() => loadAgentForEdit(a.id)} className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                  style={selectedAgentId === a.id ? { background: 'var(--primary)', color: '#FFF' } : { background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                  {a.profile_pic ? <img src={a.profile_pic} className="w-6 h-6 rounded-full object-cover" /> : <span className="text-base">{a.avatar_emoji || '🌸'}</span>}
                  <span className="truncate">{a.alias || a.name}</span>
                </button>
              ))}
              <button onClick={() => { setAgentForm({ id: '', name: '', avatar_emoji: '🌸', alias: '', bio: '', profile_pic: '', personality_text: '', age: '18', background: '', personality_md: '', user_md: '' }); setSelectedAgentId('new'); setMemories([]); }} className="w-full px-3 py-2 rounded-lg text-xs border border-dashed" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}>{t('settings.newAgent')}</button>
            </div>

            {/* Agent editor */}
            {agentForm && (
              <div className="flex-1 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { k: 'profile', l: t('settings.appearance') },
                    { k: 'user_md', l: 'USER.md' },
                    { k: 'personality_md', l: 'PERSONALITY.md' },
                    { k: 'memories', l: 'Memories' },
                  ].map(ti => (
                    <button key={ti.k} onClick={() => setAgentTab(ti.k)} style={btnStyle(agentTab === ti.k)}>{ti.l}</button>
                  ))}
                  {selectedAgentId !== 'default' && <button onClick={() => deleteAgent(selectedAgentId)} className="px-3 py-1.5 rounded-full text-xs" style={{ color: '#EF4444', marginLeft: 'auto' }}>{t('settings.delete')}</button>}
                </div>

                {agentTab === 'profile' && (
                  <div style={card}>
                    <div className="flex items-center gap-3 mb-3">
                      {agentForm.profile_pic ? <img src={agentForm.profile_pic} className="w-14 h-14 rounded-full object-cover" /> : <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{agentForm.avatar_emoji || '🌸'}</div>}
                      <button onClick={() => document.getElementById('agentPicInput2').click()} style={btnStyle(false)}>{t('settings.changeAvatar')}</button>
                      <input id="agentPicInput2" type="file" accept="image/*" onChange={(e) => uploadPic(e, setAgentForm, 'profile_pic')} className="hidden" />
                    </div>
                    {[{ k: 'name', l: t('settings.name') }, { k: 'avatar_emoji', l: t('settings.avatarEmoji') }, { k: 'alias', l: t('settings.displayAlias') }, { k: 'age', l: '年龄' }, { k: 'bio', l: t('settings.bio'), ta: true, r: 2 }, { k: 'background', l: t('settings.background'), ta: true, r: 2 }, { k: 'personality_text', l: t('settings.personalityText'), ta: true, r: 3 }].map(({ k, l, ta, r }) => (
                      <div key={k} className="mb-2"><div style={muted}>{l}</div>
                        {ta ? <textarea value={agentForm[k] || ''} onChange={e => setAgentForm(prev => ({ ...prev, [k]: e.target.value }))} rows={r || 2} style={{ ...istyle, resize: 'none', lineHeight: 1.5, fontFamily: 'monospace', fontSize: '13px' }} />
                          : <input value={agentForm[k] || ''} onChange={e => setAgentForm(prev => ({ ...prev, [k]: e.target.value }))} style={istyle} />}
                      </div>
                    ))}
                    <button onClick={saveAgent} disabled={agentSaving} className="btn btn-primary w-full">{agentSaving ? t('settings.saving') : t('diary.save')}</button>
                  </div>
                )}

                {agentTab === 'user_md' && (
                  <div style={card}>
                    <h3 style={h3style}>USER.md — {t('settings.userMdDesc')}</h3>
                    <textarea value={agentForm.user_md || ''} onChange={e => setAgentForm(prev => ({ ...prev, user_md: e.target.value }))} rows={20} className="w-full rounded-xl mt-2" style={{ ...istyle, resize: 'vertical', lineHeight: 1.6, fontFamily: 'monospace', fontSize: '12px' }} />
                    <button onClick={saveAgent} disabled={agentSaving} className="btn btn-primary w-full mt-3">{agentSaving ? t('settings.saving') : t('settings.saveProfile')}</button>
                  </div>
                )}

                {agentTab === 'personality_md' && (
                  <div style={card}>
                    <h3 style={h3style}>PERSONALITY.md — {agentForm.alias || agentForm.name} 的角色设定</h3>
                    <textarea value={agentForm.personality_md || ''} onChange={e => setAgentForm(prev => ({ ...prev, personality_md: e.target.value }))} rows={20} className="w-full rounded-xl mt-2" style={{ ...istyle, resize: 'vertical', lineHeight: 1.6, fontFamily: 'monospace', fontSize: '12px' }} />
                    <button onClick={saveAgent} disabled={agentSaving} className="btn btn-primary w-full mt-3">{agentSaving ? t('settings.saving') : t('settings.saveProfile')}</button>
                  </div>
                )}

                {agentTab === 'memories' && (
                  <div style={card}>
                    <h3 style={{ ...h3style, marginBottom: 8 }}>长期记忆碎片 ({memories.length})</h3>
                    {memories.length === 0 && <p style={muted}>暂无记忆</p>}
                    {memories.map(m => (
                      <div key={m.id} className="flex items-start gap-2 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 font-mono" style={{ background: { fact: '#E0F2FE', preference: '#FCE7F3', emotion: '#FEF3C7', event: '#D1FAE5' }[m.type] || '#F3F4F6', color: { fact: '#0369A1', preference: '#BE185D', emotion: '#B45309', event: '#047857' }[m.type] || '#6B7280' }}>{m.type}</span>
                        <div className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{m.content}</div>
                        <button onClick={() => deleteMemoryFragment(m.id)} className="text-xs flex-shrink-0" style={{ color: '#EF4444' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* UPDATE */}
        {tab === 'update' && (
          <div className="space-y-4">
            <div style={card}>
              <h2 style={{ ...h3style, marginBottom: 8 }}>{t('settings.update')}</h2>
              <p style={muted}>Git pull + npm install + rebuild + restart</p>
              <button onClick={handleUpdate} disabled={updating} className="btn btn-accent w-full mt-3">{updating ? t('settings.saving') : '🔄 Check & Update'}</button>
              {updateLog && <pre className="mt-3 p-3 rounded-lg max-h-48 overflow-y-auto text-xs font-mono" style={{ background: 'var(--bg-deep)', color: '#A3E635', whiteSpace: 'pre-wrap' }}>{updateLog}</pre>}
            </div>
            <div style={card}><h2 style={h3style}>About</h2><div className="text-xs mt-1 space-y-1" style={muted}><p>{t('app.version')}</p><p>DeepSeek + Mimo · ChromaDB · PM2</p></div></div>
          </div>
        )}
      </div>
    </div>
  );
}
