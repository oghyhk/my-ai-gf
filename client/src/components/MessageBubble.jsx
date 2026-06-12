const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function MessageBubble({ message, isUser, senderName, userPic, agentPic }) {
  const formatTime = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: userTZ });
    } catch { return ''; }
  };

  const pic = isUser ? userPic : agentPic;
  const fallbackEmoji = isUser ? '我' : 'AI';
  const fallbackGradient = isUser
    ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
    : 'linear-gradient(135deg, #8B5CF6, #EC4899)';

  const bubbleSide = isUser ? 'flex-row-reverse' : 'flex-row';
  const textAlign = isUser ? 'items-end' : 'items-start';

  return (
    <div className={`mb-2 px-3 flex flex-col ${textAlign}`}>
      <div className={`flex items-start gap-2 ${bubbleSide}`}>
        {pic ? (
          <img src={pic} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0 mt-0.5" />
        ) : (
          <div className="w-9 h-9 rounded-md flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mt-0.5" style={{ background: fallbackGradient }}>
            {fallbackEmoji}
          </div>
        )}
        <div className="min-w-0 max-w-[72%]">
          <div className={`text-[11px] mb-0.5 ${isUser ? 'text-right mr-1' : 'text-left ml-1'}`} style={{ color: 'var(--text-muted)' }}>
            {senderName || fallbackEmoji}
          </div>
          <div className={`message-bubble px-3 py-2.5 ${isUser ? 'user' : 'ai'}`}>
            {message.content || '...'}
          </div>
        </div>
      </div>
    </div>
  );
}

