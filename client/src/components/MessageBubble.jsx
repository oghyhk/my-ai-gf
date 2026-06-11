export default function MessageBubble({ message, isUser }) {
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-3 px-4`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 max-w-[85%]`}>
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${
          isUser 
            ? 'bg-gradient-to-br from-blue-400 to-blue-600' 
            : 'bg-gradient-to-br from-pink-400 to-purple-400'
        }`}>
          {isUser ? '我' : 'AI'}
        </div>
        
        {/* Bubble */}
        <div>
          <div
            className={`message-bubble px-3 py-2 rounded-xl shadow-sm text-[15px] leading-relaxed ${
              isUser
                ? 'bg-wechat-bubble-user text-black rounded-tr-sm'
                : 'bg-wechat-bubble-ai text-black rounded-tl-sm'
            }`}
          >
            {message.imageUrl && (
              <img 
                src={message.imageUrl} 
                alt="shared" 
                className="rounded-lg mb-2 max-w-[200px]"
              />
            )}
            {message.content || (isUser ? '' : '...')}
          </div>
          <div className="text-xs text-gray-400 mt-1 px-1">
            {formatTime(message.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
