import { useState, useRef } from 'react';

export default function InputBar({ onSend, disabled }) {
  const [text, setText] = useState('');
  const fileInputRef = useRef(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          disabled={disabled}
          rows={1}
          className="flex-1 px-5 py-3 text-sm rounded-full resize-none outline-none transition-all"
          style={{
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            minHeight: '44px',
            maxHeight: '100px',
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0"
          style={{
            background: text.trim() && !disabled
              ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
              : 'var(--bg-input)',
            color: text.trim() && !disabled ? '#FFF' : 'var(--text-muted)',
            boxShadow: text.trim() && !disabled ? '0 2px 8px var(--primary-glow)' : 'none',
            opacity: text.trim() && !disabled ? 1 : 0.5,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
