import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import * as api from '../api/client';
import MessageBubble from '../components/MessageBubble';
import InputBar from '../components/InputBar';
import PersonalPage from './PersonalPage';

export default function ChatPage() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [convId, setConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [view, setView] = useState('agents');
  const [showMenu, setShowMenu] = useState(false);
  const [lastUsage, setLastUsage] = useState({ prompt: 0, completion: 0 });
  const [profileTarget, setProfileTarget] = useState(null);
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => { loadAgents(); loadUserProfile(); }, []);
  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  const loadAgents = async () => { try { setAgents(await (await fetch('/api/agents')).json()); } catch (e) {} };
  const loadUserProfile = async () => { try { setUserProfile(await (await fetch('/api/profiles/me')).json()); } catch (e) {} };
  const refreshAgent = async (agentId) => { try { const d = await (await fetch(`/api/agents/${agentId}`)).json(); setAgents(prev => prev.map(a => a.id === agentId ? { ...a, ...d } : a)); } catch (e) {} };

  const selectAgent = async (agentId) => {
    setActiveAgentId(agentId); setView('chat'); await refreshAgent(agentId);
    try { const conv = await (await fetch(`/api/chat/agent-session/${agentId}`)).json(); setConvId(conv.id); setMessages(await api.getChatHistory(conv.id)); } catch (e) {}
  };

  const handleSend = useCallback(async (text) => {
    if (!convId) return;
    const userMsg = { id: Date.now().toString(), role: 'user', content: text, created_at: new Date().toISOString() };
    const assistantMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg, assistantMsg]); setStreaming(true);
    try { await api.sendMessage(convId, text, (c) => setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: m.content + c } : m)), () => setStreaming(false), (e) => { setStreaming(false); }, (u) => setLastUsage({ prompt: u.prompt || 0, completion: u.completion || 0 })); } catch (e) { setStreaming(false); }
  }, [convId]);

  const getTimeAgo = (d) => { if (!d) return ''; const diff = Math.floor((+new Date() - +new Date(d)) / 1000); if (diff < 60) return t('moments.justNow'); if (diff < 3600) return t('moments.minsAgo', { n: Math.floor(diff / 60) }); if (diff < 86400) return t('moments.hoursAgo', { n: Math.floor(diff / 3600) }); return t('moments.daysAgo', { n: Math.floor(diff / 86400) }); };

  const tokenInfo = () => {
    if (lastUsage.prompt > 0 || lastUsage.completion > 0) return { display: t('chat.tokensReal', { p: lastUsage.prompt.toLocaleString(), c: lastUsage.completion.toLocaleString() }), real: true };
    const chars = messages.reduce((sum, m) => sum + (m.content || '').length, 0);
    return { display: t('chat.tokensEst', { n: Math.ceil(chars * 1.5).toLocaleString() }), real: false };
  };
  const tk = tokenInfo();
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const agent = agents.find(a => a.id === activeAgentId);
  const userName = userProfile?.alias || t('profile.my');
  const agentName = agent?.alias || agent?.name || t('profile.AI');

  if (view === 'profile') return <PersonalPage entityId={profileTarget?.id || 'default'} entityType={profileTarget?.type || 'agent'} onBack={async () => { if (profileTarget?.type === 'agent') await refreshAgent(profileTarget.id); setView('chat'); }} />;

  if (view === 'agents') {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
        <div className="app-header"><h1 className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('chat.title')}</h1><button onClick={() => { loadUserProfile(); navigate('/settings'); }} className="w-9 h-9 rounded-lg flex items-center justify-center text-xl" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>⚙</button></div>
        <div className="flex-1 overflow-y-auto">
          {agents.length === 0 && <div className="text-center pt-20 text-sm" style={{ color: 'var(--text-muted)' }}>{t('chat.startChat')}</div>}
          {agents.map(a => (
            <div key={a.id} onClick={() => selectAgent(a.id)} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:brightness-110" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {a.profile_pic ? <img src={a.profile_pic} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" /> : <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{a.avatar_emoji || '🌸'}</div>}
              <div className="flex-1 min-w-0"><div className="flex items-center justify-between"><span className="font-medium text-[15px]" style={{ color: 'var(--text-primary)' }}>{a.alias || a.name}</span><span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{getTimeAgo(a.last_active)}</span></div><div className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.total_messages > 0 ? `${a.total_messages} ${t('chat.messages')}` : t('profile.chatWith')}</div></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
      <div className="app-header">
        <button onClick={() => { setView('agents'); setMessages([]); }} className="text-2xl leading-none mr-2 w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>‹</button>
        <div onClick={() => { setProfileTarget({ id: activeAgentId, type: 'agent' }); setView('profile'); }} className="flex items-center gap-2 cursor-pointer flex-1">
          {agent?.profile_pic ? <img src={agent.profile_pic} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" /> : <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{agent?.avatar_emoji || '🌸'}</div>}
          <h1 className="font-heading text-base font-bold" style={{ color: 'var(--text-primary)' }}>{agentName}</h1>
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-lg flex flex-col items-center justify-center gap-0.5" style={{ background: 'var(--bg-input)' }}><span className="block w-4 h-0.5 rounded-full" style={{ background: 'var(--text-secondary)' }} /><span className="block w-4 h-0.5 rounded-full" style={{ background: 'var(--text-secondary)' }} /><span className="block w-4 h-0.5 rounded-full" style={{ background: 'var(--text-secondary)' }} /></button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 rounded-xl py-1 border shadow-lg z-50 min-w-44" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}>
              <div className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{messages.length} {t('chat.context')}</div>
              <div className="px-4 py-1.5 text-xs" style={tk.real ? { color: 'var(--accent)' } : { color: 'var(--text-muted)' }}>{tk.display}</div>
              <div className="border-t mx-3 my-1" style={{ borderColor: 'var(--border-subtle)' }} />
              <button onClick={() => { setProfileTarget({ id: activeAgentId, type: 'agent' }); setView('profile'); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>{t('chat.viewProfile')}</button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4 chat-container">
        {messages.length === 0 && <div className="text-center pt-20 text-sm" style={{ color: 'var(--text-muted)' }}>{t('chat.saySomething')}</div>}
        {messages.map(msg => <MessageBubble key={msg.id} message={msg} isUser={msg.role === 'user'} senderName={msg.role === 'user' ? userName : agentName} userPic={userProfile?.profile_pic || null} agentPic={agent?.profile_pic || null} />)}
        {streaming && lastAssistantMsg?.content === '' && <div className="flex justify-start mb-3 px-4"><div className="typing-dots"><span /><span /><span /></div></div>}
        <div ref={messagesEndRef} />
      </div>
      <InputBar onSend={handleSend} disabled={streaming} placeholder={t('chat.input')} />
    </div>
  );
}
