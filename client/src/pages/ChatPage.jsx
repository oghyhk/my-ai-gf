import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api/client';
import MessageBubble from '../components/MessageBubble';
import InputBar from '../components/InputBar';
import PersonalPage from './PersonalPage';

export default function ChatPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [view, setView] = useState('agents');
  const [showMenu, setShowMenu] = useState(false);
  const [profileTarget, setProfileTarget] = useState(null);
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => { loadAgents(); loadUserProfile(); }, []);
  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => {
    const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const loadAgents = async () => {
    try { setAgents(await (await fetch('/api/agents')).json()); } catch (e) { console.error(e); }
  };

  const loadUserProfile = async () => {
    try { setUserProfile(await (await fetch('/api/profiles/me')).json()); } catch (e) { console.error(e); }
  };

  const refreshAgent = async (agentId) => {
    try {
      const d = await (await fetch(`/api/agents/${agentId}`)).json();
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, ...d } : a));
      return d;
    } catch (e) { console.error(e); }
  };

  const selectAgent = async (agentId) => {
    setActiveAgent(agentId);
    setView('sessions');
    await refreshAgent(agentId);
    try {
      const data = await (await fetch(`/api/agents/${agentId}/conversations`)).json();
      setConversations(data);
      if (data.length > 0) selectConversation(data[0].id, agentId);
    } catch (e) { console.error(e); }
  };

  const selectConversation = async (convId, agentId) => {
    setActiveConvId(convId);
    setView('chat');
    setShowMenu(false);
    try {
      setMessages(await api.getChatHistory(convId));
    } catch (e) { console.error(e); }
  };

  const createNewSession = async () => {
    const conv = await api.createConversation('', activeAgent);
    setConversations(prev => [conv, ...prev]);
    selectConversation(conv.id, activeAgent);
  };

  const deleteSession = async (convId) => {
    if (!confirm('删除这个会话及其所有消息？')) return;
    await api.deleteConversation(convId);
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConvId === convId) {
      setActiveConvId(null); setView('sessions'); setMessages([]);
    }
    setShowMenu(false);
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleSend = useCallback(async (text) => {
    if (!activeConvId) return;
    const userMsg = { id: Date.now().toString(), role: 'user', content: text, created_at: new Date().toISOString() };
    const assistantMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);
    try {
      await api.sendMessage(activeConvId, text,
        (c) => setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: m.content + c } : m)),
        () => setStreaming(false),
        (e) => { console.error(e); setStreaming(false); }
      );
    } catch (e) { console.error(e); setStreaming(false); }
  }, [activeConvId]);

  const getTimeAgo = (d) => {
    if (!d) return '';
    const diff = Math.floor((new Date() - new Date(d)) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    return Math.floor(diff / 86400) + '天前';
  };

  const estTokens = () => {
    const chars = messages.reduce((sum, m) => sum + (m.content || '').length, 0);
    return Math.ceil(chars * 0.4);
  };

  // ---- PROFILE VIEW ----
  if (view === 'profile') {
    return (
      <PersonalPage
        entityId={profileTarget?.id || 'default'}
        entityType={profileTarget?.type || 'agent'}
        onBack={async () => {
          if (profileTarget?.type === 'agent') await refreshAgent(profileTarget.id);
          setView('chat');
        }}
      />
    );
  }

  const agent = agents.find(a => a.id === activeAgent);
  const userName = userProfile?.alias || '我';
  const agentName = agent?.alias || agent?.name || 'AI';

  // ---- AGENTS VIEW ----
  if (view === 'agents') {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
        <div className="app-header">
          <h1 className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>聊天</h1>
          <button onClick={() => { loadUserProfile(); navigate('/settings'); }} className="w-9 h-9 rounded-lg flex items-center justify-center text-xl" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>⚙</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {agents.length === 0 && <div className="text-center pt-20 text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</div>}
          {agents.map(a => (
            <div key={a.id} onClick={() => selectAgent(a.id)} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:brightness-110" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {a.profile_pic
                ? <img src={a.profile_pic} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                : <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{a.avatar_emoji || '🌸'}</div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[15px]" style={{ color: 'var(--text-primary)' }}>{a.alias || a.name}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{getTimeAgo(a.last_active)}</span>
                </div>
                <div className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.session_count > 0 ? `${a.session_count} 个会话` : '点击开始聊天'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- SESSIONS VIEW ----
  if (view === 'sessions') {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
        <div className="app-header">
          <button onClick={() => setView('agents')} className="text-2xl leading-none mr-2 w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>‹</button>
          <div className="flex items-center gap-2 flex-1">
            {agent?.profile_pic
              ? <img src={agent.profile_pic} alt="" className="w-8 h-8 rounded-full object-cover" />
              : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{agent?.avatar_emoji || '🌸'}</div>
            }
            <h1 className="font-heading text-base font-bold" style={{ color: 'var(--text-primary)' }}>{agent?.alias || agent?.name}</h1>
          </div>
          <button onClick={createNewSession} className="w-9 h-9 rounded-lg flex items-center justify-center text-xl" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>+</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && <div className="text-center pt-20 text-sm" style={{ color: 'var(--text-muted)' }}>点击 + 开始新会话</div>}
          {conversations.map(conv => (
            <div key={conv.id} onClick={() => selectConversation(conv.id, activeAgent)} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:brightness-110" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[15px]" style={{ color: 'var(--text-primary)' }}>{conv.title || `会话 ${conv.id.substring(0, 8)}`}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{getTimeAgo(conv.updated_at)}</span>
                </div>
                <div className="text-[13px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{conv.message_count ? `${conv.message_count} 条消息` : '新会话'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- CHAT VIEW ----
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
      <div className="app-header">
        <button onClick={() => { setView('sessions'); setMessages([]); }} className="text-2xl leading-none mr-2 w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>‹</button>
        <div
          onClick={() => { setProfileTarget({ id: activeAgent, type: 'agent' }); setView('profile'); }}
          className="flex items-center gap-2 cursor-pointer flex-1"
        >
          {agent?.profile_pic
            ? <img src={agent.profile_pic} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            : <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{agent?.avatar_emoji || '🌸'}</div>
          }
          <h1 className="font-heading text-base font-bold" style={{ color: 'var(--text-primary)' }}>{agentName}</h1>
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-lg flex flex-col items-center justify-center gap-0.5" style={{ background: 'var(--bg-input)' }}>
            <span className="block w-4 h-0.5 rounded-full" style={{ background: 'var(--text-secondary)' }} /><span className="block w-4 h-0.5 rounded-full" style={{ background: 'var(--text-secondary)' }} /><span className="block w-4 h-0.5 rounded-full" style={{ background: 'var(--text-secondary)' }} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 rounded-xl py-1 border shadow-lg z-50 min-w-52 max-h-80 overflow-y-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}>
              <div className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                会话列表 · {conversations.length} 个会话
              </div>
              {conversations.map(conv => (
                <button key={conv.id}
                  onClick={() => { selectConversation(conv.id, activeAgent); }}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between ${conv.id === activeConvId ? 'font-medium' : ''}`}
                  style={{ color: conv.id === activeConvId ? 'var(--secondary)' : 'var(--text-secondary)' }}
                >
                  <span>{conv.title || `会话 ${conv.id.substring(0, 8)}`}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{conv.message_count}条</span>
                </button>
              ))}
              <div className="border-t mx-3 my-1" style={{ borderColor: 'var(--border-subtle)' }} />
              <div className="px-4 py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                当前会话 · 约 {estTokens().toLocaleString()} tokens
              </div>
              <div className="border-t mx-3 my-1" style={{ borderColor: 'var(--border-subtle)' }} />
              <button onClick={createNewSession} className="w-full text-left px-4 py-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>＋ 新建会话</button>
              <button onClick={() => deleteSession(activeConvId)} className="w-full text-left px-4 py-2.5 text-sm" style={{ color: '#EF4444' }}>✕ 删除当前会话</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 chat-container">
        {messages.length === 0 && <div className="text-center pt-20 text-sm" style={{ color: 'var(--text-muted)' }}>说点什么开始聊天吧</div>}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isUser={msg.role === 'user'}
            senderName={msg.role === 'user' ? userName : agentName}
          />
        ))}
        {streaming && lastAssistantMsg?.content === '' && (
          <div className="flex justify-start mb-3 px-4"><div className="typing-dots"><span /><span /><span /></div></div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <InputBar onSend={handleSend} disabled={streaming} />
    </div>
  );
}
