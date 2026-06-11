import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Calendar } from 'lucide-react';

export default function RelationshipBadge() {
  const [relationship, setRelationship] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelationship();
  }, []);

  const fetchRelationship = async () => {
    try {
      const res = await fetch('/api/relationship');
      if (res.ok) {
        const data = await res.json();
        setRelationship(data);
      }
    } catch (error) {
      console.error('Failed to fetch relationship:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !relationship) return null;

  const levelNames = ['初识', '熟悉', '友好', '亲密', '挚友', '知己', '灵魂伴侣'];
  const levelName = levelNames[Math.min(relationship.level - 1, levelNames.length - 1)] || '挚友';

  return (
    <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-3 mb-4 border border-pink-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-pink-500 fill-pink-500" />
          <span className="text-sm font-medium text-gray-700">
            {levelName} · Lv.{relationship.level}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MessageCircle size={12} />
            {relationship.total_messages}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {relationship.total_days}天
          </span>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-pink-500 to-purple-500 h-1.5 rounded-full transition-all"
          style={{ width: `${relationship.progress_to_next * 100}%` }}
        />
      </div>
      {relationship.milestones && relationship.milestones.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {relationship.milestones.slice(-3).map((m, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-600">
              {m.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
