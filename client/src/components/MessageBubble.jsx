const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function MessageBubble({ message, isUser, senderName, userPic, agentPic }) {
  const formatTime = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: userTZ });
    } catch { return ''; }
  };

  // User messages: right-aligned, no avatar, no name (WeChat style)
  if (isUser) {
    return (
      <div className="flex justify-end mb-2 px-3">
        <div className="max-w-[75%]">
          <div className="message-bubble user px-3 py-2.5">
            {message.content || '...'}
          </div>
        </div>
      </div>
    );
  }

  // AI messages: left-aligned with avatar + name (WeChat group style)
  return (
    <div className="flex items-start gap-2 mb-2 px-3">
      {agentPic ? (
        <img src={agentPic} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0 mt-0.5" />
      ) : (
        <div className="w-9 h-9 rounded-md flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mt-0.5 bg-gradient-to-br from-violet-500 to-indigo-500">AI</div>
      )}
      <div className="min-w-0 max-w-[75%]">
        {senderName && (
          <div className="text-[11px] mb-0.5 px-1" style={{ color: 'var(--text-muted)' }}>{senderName}</div>
        )}
        <div className="message-bubble ai px-3 py-2.5">
          {message.content || '...'}
        </div>
      </div>
    </div>
  );
}
