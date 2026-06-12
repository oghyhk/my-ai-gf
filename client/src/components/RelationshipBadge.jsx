import { useState, useEffect } from 'react';

export default function RelationshipBadge() {
  const [relationship, setRelationship] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRelationship(); }, []);

  const fetchRelationship = async () => {
    try {
      const res = await fetch('/api/relationship');
      if (res.ok) setRelationship(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading || !relationship) return null;

  const levelNames = ['初识', '熟悉', '友好', '亲密', '挚友', '知己', '灵魂伴侣'];
  const levelName = levelNames[Math.min(relationship.level - 1, levelNames.length - 1)] || '挚友';

  return (
    <div className="card p-3" style={{ borderColor: 'var(--border-default)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--accent)' }}>💛</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {levelName} · Lv.{relationship.level}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span>{relationship.total_messages}条</span>
          <span>{relationship.total_days}天</span>
        </div>
      </div>
      <div className="w-full rounded-full h-1" style={{ background: 'var(--border-strong)' }}>
        <div className="h-1 rounded-full transition-all" style={{
          width: `${(relationship.progress_to_next || 0) * 100}%`,
          background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
        }} />
      </div>
    </div>
  );
}
