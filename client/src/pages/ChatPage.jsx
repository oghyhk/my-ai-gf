import { useEffect, useRef, useState, useCallback } from 'react';
import MessageBubble from '../components/MessageBubble';
import InputBar from '../components/InputBar';
import * as api from '../api/client';

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [showConvList, setShowConvList] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    const convs = await api.getConversations();
    setConversations(convs);
    if (convs.length > 0 && !activeConvId) {
      selectConversation(convs[0].id);
    }
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = useCallback(async (text) => {
    if (!activeConvId) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    const assistantMsg = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setStreaming(true);

    try {
      await api.sendMessage(
        activeConvId,
        text,
        (chunk) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        },
        (data) => {
          setStreaming(false);
        },
        (error) => {
          console.error('Chat error:', error);
          setStreaming(false);
        }
      );
    } catch (e) {
      console.error('Send error:', e);
      setStreaming(false);
    }
  }, [activeConvId]);

  const handleImageSend = useCallback(async (file) => {
    if (!activeConvId) return;

    const imageUrl = URL.createObjectURL(file);
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: '[图片]',
      imageUrl,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    const assistantMsg = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setStreaming(true);

    try {
      await api.sendImage(
        activeConvId,
        file,
        (chunk) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        },
        () => setStreaming(false),
        (error) => {
          console.error('Image error:', error);
          setStreaming(false);
        }
      );
    } catch (e) {
      console.error('Image send error:', e);
      setStreaming(false);
    }
  }, [activeConvId]);

  const handleExport = async () => {
    if (!activeConvId) return;
    const data = await api.exportConversation(activeConvId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${activeConvId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (showConvList) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="bg-wechat-green text-white px-4 py-3 flex items-center justify-between">
          <span className="font-medium text-lg">聊天</span>
          <div className="flex gap-3">
            <button onClick={handleExport} className="text-white/80 hover:text-white text-sm">
              导出
            </button>
            <button onClick={createNewConversation} className="text-white/80 hover:text-white text-2xl leading-none">
              +
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              开始一个新对话吧 💬
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 active:bg-gray-50 cursor-pointer"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-400 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  AI
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {conv.title || 'AI Companion'}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {conv.last_message ? (conv.last_message.length > 30 ? conv.last_message.substring(0, 30) + '...' : conv.last_message) : '暂无消息'}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {conv.message_count || 0}条
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-wechat-bg">
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm border-b border-gray-100">
        <button
          onClick={() => setShowConvList(true)}
          className="text-wechat-green text-2xl leading-none"
        >
          ‹
        </button>
        <div className="font-medium text-gray-900 flex-1 text-center">AI Companion</div>
        <button onClick={handleExport} className="text-gray-500 text-sm">
          导出
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 scroll-smooth chat-container">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            说点什么开始聊天吧 👋
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isUser={msg.role === 'user'}
          />
        ))}
        {streaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start mb-4 px-4">
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm typing-indicator">
              <span className="text-gray-400">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <InputBar
        onSend={handleSend}
        onImageSend={handleImageSend}
        disabled={streaming}
      />
    </div>
  );
}
