import { useEffect, useState } from 'react';

export default function PersonalPage({ entityId, entityType, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [entityId, entityType]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const url = entityType === 'agent'
        ? `/api/profiles/agent/${entityId}`
        : '/api/profiles/me';
      const res = await fetch(url);
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
      <div className="app-header">
        <button onClick={onBack} className="text-2xl leading-none mr-2 w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>‹</button>
      </div>
      <div className="text-center pt-20 text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</div>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
      <div className="app-header">
        <button onClick={onBack} className="text-2xl leading-none mr-2 w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>‹</button>
      </div>
      <div className="text-center pt-20 text-sm" style={{ color: 'var(--text-muted)' }}>未找到</div>
    </div>
  );

  const Moments = data.moments || [];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
      <div className="app-header">
        <button onClick={onBack} className="text-2xl leading-none mr-2 w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>‹</button>
        <h1 className="font-heading text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          {data.alias || data.name || (entityType === 'user' ? '我的主页' : 'AI 主页')}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="p-6 pb-8" style={{ background: 'linear-gradient(180deg, rgba(67,56,202,0.15), transparent)' }}>
          <div className="flex flex-col items-center">
            {data.profile_pic ? (
              <img src={data.profile_pic} alt="" className="w-24 h-24 rounded-full object-cover border-2 mb-3" style={{ borderColor: 'var(--primary)' }} />
            ) : (
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-3 border-2" style={{ borderColor: 'var(--primary)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                {data.avatar_emoji || '🌸'}
              </div>
            )}
            <h2 className="font-heading text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
              {data.alias || data.name || '我'}
            </h2>
            {data.bio && (
              <p className="text-sm mt-2 text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>{data.bio}</p>
            )}
            {entityType === 'agent' && data.age && (
              <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{data.age}岁 · {data.background?.substring(0, 20)}</span>
            )}
          </div>
        </div>

        {/* Moments / 朋友圈 */}
        <div className="px-4 pb-8">
          <h3 className="font-heading text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            {entityType === 'user' ? '我的朋友圈' : `${data.alias || data.name}的朋友圈`}
          </h3>
          {Moments.length === 0 ? (
            <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
              {entityType === 'user' ? '还没有发过朋友圈' : '暂无动态'}
            </div>
          ) : (
            <div className="space-y-3">
              {Moments.map(moment => (
                <div key={moment.id} className="card p-4">
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    {new Date(moment.created_at).toLocaleString('zh-CN')}
                  </div>
                  {moment.content && (
                    <div className="text-sm whitespace-pre-wrap mb-2" style={{ color: 'var(--text-primary)' }}>{moment.content}</div>
                  )}
                  {moment.images?.length > 0 && (
                    <div className={`grid gap-1.5 ${moment.images.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                      {moment.images.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                  {(moment.interactions?.length > 0) && (
                    <div className="mt-2 rounded-lg p-2" style={{ background: 'var(--bg-input)' }}>
                      {moment.interactions.map((intr, i) => (
                        <div key={i} className="text-xs flex items-start gap-1">
                          {intr.type === 'like'
                            ? <span style={{ color: 'var(--accent)' }}>❤️ 赞了</span>
                            : <span style={{ color: 'var(--text-secondary)' }}>{intr.content}</span>
                          }
                        </div>
                      ))}
                    </div>
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
