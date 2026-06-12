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

  const [userMd, setUserMd] = useState('');
  const [userSaving, setUserSaving] = useState(false);
  const [userProfile, setUserProfile] = useState({ alias: '', bio: '', profile_pic: '' });
  const [userProfileSaving, setUserProfileSaving] = useState(false);

  const [agents, setAgents] = useState([]);
  const [editingAgent, setEditingAgent] = useState(null);
  const [agentForm, setAgentForm] = useState(null);
  const [agentSaving, setAgentSaving] = useState(false);

  useEffect(() => { loadUserProfile(); loadAgents(); loadUserPageProfile(); }, []);

  const loadUserProfile = async () => {
    try { setUserMd((await (await fetch('/api/agents/user/profile')).json()).content || ''); } catch (e) {}
  };
  const loadUserPageProfile = async () => {
    try { const d = await (await fetch('/api/profiles/me')).json(); setUserProfile({ alias: d.alias || '', bio: d.bio || '', profile_pic: d.profile_pic || '' }); } catch (e) {}
  };
  const loadAgents = async () => {
    try { setAgents(await (await fetch('/api/agents')).json()); } catch (e) {}
  };
  const loadAgentDetail = async (id) => {
    try {
      const d = await (await fetch(`/api/agents/${id}`)).json();
      setAgentForm({ id: d.id, name: d.name || '', avatar_emoji: d.avatar_emoji || '🌸', alias: d.alias || '', bio: d.bio || '', profile_pic: d.profile_pic || '', personality_text: d.personality || '', age: d.age || '', background: d.background || '', personality_md: d.personality_md || '' });
      setEditingAgent(id);
    } catch (e) {}
  };

  const uploadPic = async (e, setFn, field, url) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('image', file);
    try { const r = await (await fetch('/api/profiles/upload-pic', { method: 'POST', body: fd })).json(); if (r.url) setFn(prev => ({ ...prev, [field]: r.url })); } catch (err) {}
    e.target.value = '';
  };

  const saveUserPage = async () => { setUserProfileSaving(true); try { await fetch('/api/profiles/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userProfile) }); alert(t('settings.saved')); } catch (e) { alert(t('settings.saveFail')); } finally { setUserProfileSaving(false); } };
  const saveUserMd = async () => { setUserSaving(true); try { await fetch('/api/agents/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: userMd }) }); alert(t('settings.saved')); } catch (e) { alert(t('settings.saveFail')); } finally { setUserSaving(false); } };
  const saveAgent = async () => {
    if (!agentForm) return; setAgentSaving(true);
    try {
      const method = agentForm.id && agents.find(a => a.id === agentForm.id) ? 'PUT' : 'POST';
      const url = agentForm.id && agents.find(a => a.id === agentForm.id) ? `/api/agents/${agentForm.id}` : '/api/agents';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(agentForm) });
      await loadAgents(); setEditingAgent(null); setAgentForm(null); alert(t('settings.saved'));
    } catch (e) { alert(t('settings.saveFail')); } finally { setAgentSaving(false); }
  };
  const deleteAgent = async (id) => { if (id === 'default') return alert(t('settings.cannotDelete')); if (!confirm(t('settings.confirmDelete'))) return; try { await fetch(`/api/agents/${id}`, { method: 'DELETE' }); loadAgents(); } catch (e) { alert(t('settings.deleteFail')); } };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setBgUploading(true);
    try { const d = await (await fetch('/api/moments/upload', { method: 'POST', body: (() => { const fd = new FormData(); fd.append('image', file); return fd; })() })).json(); if (d.urls?.[0]) setBackground(d.urls[0]); } catch (er) {} finally { setBgUploading(false); e.target.value = ''; }
  };

  const handleUpdate = async () => { setUpdating(true); setUpdateLog(''); try { const r = await fetch('/api/agent/update', { method: 'POST' }); const reader = r.body.getReader(); const d = new TextDecoder(); let l = ''; while (true) { const { done, value } = await reader.read(); if (done) break; l += d.decode(value, { stream: true }); setUpdateLog(l); } } catch (er) { setUpdateLog('Error: ' + er.message); } finally { setUpdating(false); window.location.reload(); } };

  const tabs = [
    { key: 'appearance', label: t('settings.appearance') },
    { key: 'mypage', label: t('settings.myPage') },
    { key: 'profile', label: t('settings.myProfile') },
    { key: 'agents', label: t('settings.agents') },
    { key: 'update', label: t('settings.update') },
  ];

  const istyle = { background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%' };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
      <div className="app-header"><h1 className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('settings.title')}</h1></div>
      <div className="flex gap-1 px-4 py-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(tabItem => (
          <button key={tabItem.key} onClick={() => setTab(tabItem.key)} className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap"
            style={tab === tabItem.key ? { background: 'var(--primary)', color: '#FFF' } : { color: 'var(--text-muted)' }}>{tabItem.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'appearance' && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings.darkMode')}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{theme === 'dark' ? t('settings.darkModeOn') : t('settings.darkModeOff')}</div></div>
                <button onClick={toggleTheme} className="w-14 h-7 rounded-full relative" style={{ background: theme === 'dark' ? 'var(--primary)' : 'var(--border-strong)' }}>
                  <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-xs" style={{ transform: theme === 'dark' ? 'translateX(28px)' : 'translateX(2px)' }}>{theme === 'dark' ? '🌙' : '☀️'}</div>
                </button>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div><div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings.language')}</div></div>
                <div className="flex gap-2">
                  <button onClick={() => switchLang('zh')} className="px-3 py-1 rounded-full text-xs" style={lang === 'zh' ? { background: 'var(--primary)', color: '#FFF' } : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{t('settings.languageZh')}</button>
                  <button onClick={() => switchLang('en')} className="px-3 py-1 rounded-full text-xs" style={lang === 'en' ? { background: 'var(--primary)', color: '#FFF' } : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{t('settings.languageEn')}</button>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('settings.bgImage')}</div>
              {bgImage ? (
                <div className="flex items-center gap-3"><img src={bgImage} alt="" className="w-20 h-12 object-cover rounded-lg" />
                  <div className="flex gap-2">
                    <button onClick={() => document.getElementById('bgInput').click()} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{t('settings.change')}</button>
                    <button onClick={removeBackground} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>{t('settings.remove')}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => document.getElementById('bgInput').click()} disabled={bgUploading} className="w-full py-3 rounded-lg text-sm border border-dashed" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}>{bgUploading ? t('settings.upload') : t('settings.selectBg')}</button>
              )}
              <input id="bgInput" type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
            </div>
          </div>
        )}

        {tab === 'mypage' && (
          <div className="card p-4 space-y-3">
            <h2 className="font-heading text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.myPage')}</h2>
            <div className="flex items-center gap-3">
              {userProfile.profile_pic ? <img src={userProfile.profile_pic} alt="" className="w-16 h-16 rounded-full object-cover border-2" style={{ borderColor: 'var(--primary)' }} /> : <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>👤</div>}
              <button onClick={() => picInputRef.current?.click()} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{t('settings.changeAvatar')}</button>
              <input ref={picInputRef} type="file" accept="image/*" onChange={(e) => uploadPic(e, setUserProfile, 'profile_pic', '/api/profiles/me')} className="hidden" />
            </div>
            {[{ k: 'alias', l: t('settings.alias'), ph: t('settings.aliasPh') }, { k: 'bio', l: t('settings.bio'), ph: t('settings.bioPh'), ta: true }].map(({ k, l, ph, ta }) => (
              <div key={k}><div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{l}</div>
                {ta ? <textarea value={userProfile[k]} onChange={e => setUserProfile(prev => ({ ...prev, [k]: e.target.value }))} rows={2} placeholder={ph} style={{ ...istyle, resize: 'none' }} />
                  : <input value={userProfile[k]} onChange={e => setUserProfile(prev => ({ ...prev, [k]: e.target.value }))} placeholder={ph} style={istyle} />}
              </div>
            ))}
            <button onClick={saveUserPage} disabled={userProfileSaving} className="btn btn-primary w-full">{userProfileSaving ? t('settings.saving') : t('settings.savePage')}</button>
          </div>
        )}

        {tab === 'profile' && (
          <div className="card p-4">
            <h2 className="font-heading text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('settings.myProfile')}</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{t('settings.userMdDesc')}</p>
            <textarea value={userMd} onChange={e => setUserMd(e.target.value)} rows={12} className="w-full rounded-xl resize-none text-sm font-mono" style={{ ...istyle, lineHeight: 1.6 }} />
            <button onClick={saveUserMd} disabled={userSaving} className="btn btn-primary w-full mt-3">{userSaving ? t('settings.saving') : t('settings.saveProfile')}</button>
          </div>
        )}

        {tab === 'agents' && (
          <div className="space-y-4">
            {editingAgent ? (
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{editingAgent && agents.find(a => a.id === editingAgent) ? t('settings.editAgent') : t('settings.newAgentTitle')}</h2>
                  <button onClick={() => { setEditingAgent(null); setAgentForm(null); }} className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('diary.cancel')}</button>
                </div>
                <div className="flex items-center gap-3">
                  {agentForm?.profile_pic ? <img src={agentForm.profile_pic} alt="" className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{agentForm?.avatar_emoji || '🌸'}</div>}
                  <button onClick={() => document.getElementById('agentPicInput').click()} className="px-3 py-1 rounded-lg text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{t('settings.changeAvatar')}</button>
                  <input id="agentPicInput" type="file" accept="image/*" onChange={(e) => uploadPic(e, setAgentForm, 'profile_pic')} className="hidden" />
                </div>
                {[{ k: 'name', l: t('settings.name') }, { k: 'avatar_emoji', l: t('settings.avatarEmoji') }, { k: 'alias', l: t('settings.displayAlias') }, { k: 'bio', l: t('settings.bio'), ta: true, r: 2 }, { k: 'age', l: t('personal.yearsOld').replace('{age}', '') + '...' }, { k: 'background', l: t('settings.background'), ta: true, r: 2 }, { k: 'personality_text', l: t('settings.personalityText'), ta: true, r: 2 }, { k: 'personality_md', l: t('settings.fullPersonality'), ta: true, r: 6 }].map(({ k, l, ta, r }) => (
                  <div key={k}><div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{l}</div>
                    {ta ? <textarea value={agentForm?.[k] || ''} onChange={e => setAgentForm(prev => ({ ...prev, [k]: e.target.value }))} rows={r || 2} className="w-full rounded-xl resize-none text-sm font-mono" style={{ ...istyle, lineHeight: 1.5 }} />
                      : <input value={agentForm?.[k] || ''} onChange={e => setAgentForm(prev => ({ ...prev, [k]: e.target.value }))} style={istyle} />}
                  </div>
                ))}
                <button onClick={saveAgent} disabled={agentSaving} className="btn btn-primary w-full">{agentSaving ? t('settings.saving') : t('diary.save')}</button>
              </div>
            ) : (
              <>
                <button onClick={() => { setAgentForm({ id: '', name: '', avatar_emoji: '🌸', alias: '', bio: '', profile_pic: '', personality_text: '', age: '', background: '', personality_md: '' }); setEditingAgent('new'); }} className="btn w-full border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>{t('settings.newAgent')}</button>
                {agents.map(agent => (
                  <div key={agent.id} className="card p-4 flex items-center gap-3">
                    {agent.profile_pic ? <img src={agent.profile_pic} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{agent.avatar_emoji || '🌸'}</div>}
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{agent.alias || agent.name}</div><div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{agent.bio || agent.name}</div></div>
                    <div className="flex gap-2">
                      <button onClick={() => loadAgentDetail(agent.id)} className="px-3 py-1 rounded-lg text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{t('settings.edit')}</button>
                      {agent.id !== 'default' && <button onClick={() => deleteAgent(agent.id)} className="px-3 py-1 rounded-lg text-xs" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>{t('settings.delete')}</button>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'update' && (
          <div className="space-y-4">
            <div className="card p-4">
              <h2 className="font-heading text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('settings.update')}</h2>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Git pull + rebuild</p>
              <button onClick={handleUpdate} disabled={updating} className="btn btn-accent w-full">{updating ? t('settings.saving') : '🔄 Check & Update'}</button>
              {updateLog && <pre className="mt-3 p-3 rounded-lg overflow-x-auto max-h-48 overflow-y-auto text-xs font-mono" style={{ background: 'var(--bg-deep)', color: '#A3E635' }}>{updateLog}</pre>}
            </div>
            <div className="card p-4"><h2 className="font-heading text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>About</h2><div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}><p>{t('app.version')}</p><p>DeepSeek + Mimo · ChromaDB · PM2</p></div></div>
          </div>
        )}
      </div>
    </div>
  );
}
