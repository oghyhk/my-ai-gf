const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function MessageBubble({ message, isUser, senderName }) {
  const formatTime = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: userTZ });
    } catch { return ''; }
  };

  return (
    <div className={`mb-3 px-4 ${isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
      {/* Sender name */}
      <div className="text-[11px] mb-0.5 px-1" style={{ color: 'var(--text-muted)' }}>
        {senderName || (isUser ? '我' : 'AI')}
      </div>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2`}>
        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${
          isUser ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-gradient-to-br from-violet-500 to-indigo-500'
        }`}>
          {isUser ? '我' : 'AI'}
        </div>
        <div className="min-w-0">
          <div className={`message-bubble ${isUser ? 'user' : 'ai'}`}>
            {message.content || (isUser ? '' : '...')}
          </div>
          {message.created_at && (
            <div className="text-[10px] mt-0.5 px-1" style={{ color: 'var(--text-muted)' }}>
              {formatTime(message.created_at)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
