export default function MomentCard({ moment, onDelete }) {
  const timeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return '刚刚'; if (diff < 3600) return `${Math.floor(diff/60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff/3600)}小时前`;
    return `${Math.floor(diff/86400)}天前`;
  };

  return (
    <div className="card p-4 mb-3" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>我</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>我</span>
            <button onClick={() => onDelete(moment.id)} className="text-xs" style={{ color: 'var(--text-muted)' }}>删除</button>
          </div>
          <div className="text-sm mb-2 whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{moment.content}</div>

          {moment.images?.length > 0 && (
            <div className={`grid gap-1.5 mb-2 ${moment.images.length===1?'grid-cols-1':moment.images.length<=4?'grid-cols-2':'grid-cols-3'}`}>
              {moment.images.map((url, i) => (
                <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
              ))}
            </div>
          )}

          <div className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>{timeAgo(moment.created_at)}</div>

          {moment.interactions?.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-input)' }}>
              {moment.interactions.map((interaction, i) => (
                <div key={i} className="flex items-start gap-2 mb-1 last:mb-0">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>AI</div>
                  {interaction.type === 'like'
                    ? <span className="text-sm" style={{ color: 'var(--accent)' }}>❤️ 赞了你的动态</span>
                    : <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{interaction.content}</span>
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
