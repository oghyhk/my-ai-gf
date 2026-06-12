import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import MessageBubble from '../components/MessageBubble';
import InputBar from '../components/InputBar';
import RelationshipBadge from '../components/RelationshipBadge';
import * as api from '../api/client';

export default function ChatPage() {
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [showConvList, setShowConvList] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const loadConversations = async () => {
    const convs = await api.getConversations();
    setConversations(convs);
    if (convs.length > 0 && !activeConvId) selectConversation(convs[0].id);
  };

  const selectConversation = async (id) => {
    setActiveConvId(id);
    setShowConvList(false);
    const history = await api.getChatHistory(id);
    setMessages(history);
  };

  const createNewConversation = async () => {
    const conv = await api.createConversation();
    setConversations([conv, ...conversations]);
    selectConversation(conv.id);
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
        (chunk) => setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m)),
        () => setStreaming(false),
        (err) => { console.error(err); setStreaming(false); }
      );
    } catch (e) { console.error(e); setStreaming(false); }
  }, [activeConvId]);

  const handleExport = async () => {
    if (!activeConvId) return;
    const data = await api.exportConversation(activeConvId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `chat-${activeConvId}.json`; a.click();
  };

  if (showConvList) {
    return (
      <div className="flex flex-col h-full">
        <div className="app-header">
          <h1 className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>聊天</h1>
          <div className="flex gap-2">
            <button onClick={toggleTheme} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-input)' }}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={createNewConversation} className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              +
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>开始一个新对话吧 💬</div>
          ) : (
            conversations.map(conv => (
              <div key={conv.id} onClick={() => selectConversation(conv.id)} className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>AI</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{conv.title || 'AI Companion'}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{conv.last_message?.substring(0, 30) || '暂无消息'}</div>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{conv.message_count || 0}条</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

  return (
    <div className="flex flex-col h-full">
      <div className="app-header">
        <button onClick={() => setShowConvList(true)} className="text-2xl leading-none mr-2" style={{ color: 'var(--text-secondary)' }}>‹</button>
        <h1 className="font-heading text-base font-bold flex-1" style={{ color: 'var(--text-primary)' }}>AI Companion</h1>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-input)' }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={handleExport} className="text-xs" style={{ color: 'var(--text-muted)' }}>导出</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 chat-container">
        <div className="px-4 mb-4"><RelationshipBadge /></div>
        {messages.length === 0 && (
          <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>说点什么开始聊天吧 👋</div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isUser={msg.role === 'user'} />
        ))}
        {streaming && lastAssistantMsg?.content === '' && (
          <div className="flex justify-start mb-3 px-4">
            <div className="typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <InputBar onSend={handleSend} disabled={streaming} />
    </div>
  );
}
