import { useState, useRef } from 'react';
import * as api from '../api/client';

export default function CreateMoment({ onCreate }) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const data = await api.uploadMomentImages(files);
      setImages(prev => [...prev, ...data.urls]);
    } catch (e) { console.error(e); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleSubmit = () => {
    if (!content.trim() && !images.length) return;
    onCreate({ content, images });
    setContent(''); setImages([]);
  };

  return (
    <div className="card p-4 mb-3">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="分享你的想法..."
        rows={3}
        className="w-full p-3 rounded-xl text-sm mb-2 outline-none resize-none"
        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
      />
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />
              <button onClick={() => setImages(prev => prev.filter((_,j) => j!==i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{ background: '#EF4444' }}>×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
          📷 {uploading ? '上传中...' : '添加图片'}
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
        </label>
        <button onClick={handleSubmit} className="btn btn-primary ml-auto text-sm px-5 py-1.5" disabled={(!content.trim()&&!images.length)||uploading}>
          发布
        </button>
      </div>
    </div>
  );
}
