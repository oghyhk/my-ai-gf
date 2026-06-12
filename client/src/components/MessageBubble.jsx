const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function MessageBubble({ message, isUser, senderName, userPic, agentPic }) {
  const formatTime = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: userTZ });
    } catch { return ''; }
  };

  const pic = isUser ? userPic : agentPic;
  const fallbackLabel = isUser ? '我' : 'AI';
  const fallbackGradient = isUser
    ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
    : 'linear-gradient(135deg, #8B5CF6, #EC4899)';

  return (
    <div className="mb-2 px-3">
      <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
        {pic ? (
          <img src={pic} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0 mt-0.5" />
        ) : (
          <div className="w-9 h-9 rounded-md flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5" style={{ background: fallbackGradient }}>
            {fallbackLabel}
          </div>
        )}
        <div className={`min-w-0 ${isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
          <div className="text-[11px] mb-0.5 px-1" style={{ color: 'var(--text-muted)' }}>
            {senderName || fallbackLabel}
          </div>
          <div className={`message-bubble px-3 py-2.5 ${isUser ? 'user' : 'ai'}`} style={{ maxWidth: '100%' }}>
            {message.content || ''}
          </div>
        </div>
      </div>
    </div>
  );
}
