import { useEffect, useState } from 'react';
import * as api from '../api/client';

export default function SettingsPage() {
  const [personality, setPersonality] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [personalityData, statusData] = await Promise.all([
        api.getPersonality(),
        api.getAgentStatus(),
      ]);
      setPersonality(personalityData);
      setAgentStatus(statusData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updatePersonality(personality);
      alert('保存成功！');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const emotionLabels = {
    happiness: '开心',
    sadness: '难过',
    anger: '生气',
    surprise: '惊讶',
    fear: '害怕',
    disgust: '厌恶',
    affection: '好感',
    curiosity: '好奇',
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-wechat-bg">
        <div className="bg-white px-4 py-3 text-center font-medium text-gray-900 shadow-sm border-b border-gray-200">
          设置
        </div>
        <div className="text-center text-gray-400 mt-20">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-wechat-bg">
      <div className="bg-white px-4 py-3 text-center font-medium text-gray-900 shadow-sm border-b border-gray-200">
        设置
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Agent Status */}
        {agentStatus && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h2 className="font-medium text-gray-900 text-lg mb-3">AI 状态</h2>
            <div className="mb-3">
              <span className="text-gray-600">名字: </span>
              <span className="font-medium">{agentStatus.name}</span>
            </div>
            <h3 className="font-medium text-gray-700 text-sm mb-2">情绪状态</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(agentStatus.emotions || {}).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-16">
                    {emotionLabels[key] || key}
                  </span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-wechat-green rounded-full transition-all"
                      style={{ width: `${(value * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">
                    {(value * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personality Settings */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="font-medium text-gray-900 text-lg mb-3">AI 人格设置</h2>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名字
            </label>
            <input
              type="text"
              value={personality?.name || ''}
              onChange={(e) => setPersonality({ ...personality, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wechat-green"
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              年龄
            </label>
            <input
              type="text"
              value={personality?.age || ''}
              onChange={(e) => setPersonality({ ...personality, age: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wechat-green"
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              人格描述
            </label>
            <textarea
              value={personality?.personality || ''}
              onChange={(e) => setPersonality({ ...personality, personality: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wechat-green resize-none"
              placeholder="描述 AI 的性格特点、说话风格..."
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              背景故事
            </label>
            <textarea
              value={personality?.background || ''}
              onChange={(e) => setPersonality({ ...personality, background: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wechat-green resize-none"
              placeholder="AI 的背景故事..."
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 bg-wechat-green text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>

        {/* About */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-medium text-gray-900 text-lg mb-3">关于</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>AI Companion v1.0.0</p>
            <p>基于 DeepSeek + Mimo 构建</p>
            <p>三层混合记忆系统 (FTS5 + Vector + Entity)</p>
            <p>动态情感引擎 + RRF 融合召回</p>
          </div>
        </div>
      </div>
    </div>
  );
}
