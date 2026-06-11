export default function MomentCard({ moment, onDelete }) {
  const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
  };

  return (
    <div className="bg-white p-4 mb-2">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
          我
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-gray-900">我</span>
            <button
              onClick={() => onDelete(moment.id)}
              className="text-gray-400 hover:text-red-500 text-sm"
            >
              删除
            </button>
          </div>
          <div className="text-gray-800 mb-2 whitespace-pre-wrap">{moment.content}</div>
          
          {moment.images && moment.images.length > 0 && (
            <div className={`grid gap-2 mb-2 ${
              moment.images.length === 1 ? 'grid-cols-1' : 
              moment.images.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
            }`}>
              {moment.images.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt=""
                  className="w-full aspect-square object-cover rounded"
                />
              ))}
            </div>
          )}

          <div className="text-xs text-gray-500 mb-2">{timeAgo(moment.created_at)}</div>

          {moment.interactions && moment.interactions.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 mt-2">
              {moment.interactions.map((interaction, index) => (
                <div key={index} className="flex items-start gap-2 mb-1 last:mb-0">
                  <div className="w-6 h-6 bg-gradient-to-br from-pink-400 to-purple-400 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    AI
                  </div>
                  {interaction.type === 'like' ? (
                    <span className="text-red-500 text-sm">❤️ 赞了你的动态</span>
                  ) : (
                    <span className="text-gray-800 text-sm">{interaction.content}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
