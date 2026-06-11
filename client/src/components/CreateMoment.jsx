import { useState, useRef } from 'react';
import * as api from '../api/client';

export default function CreateMoment({ onCreate }) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const data = await api.uploadMomentImages(files);
      setImages([...images, ...data.urls]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = () => {
    if (!content.trim() && images.length === 0) return;
    onCreate({ content, images });
    setContent('');
    setImages([]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white p-4 border-b border-gray-200">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="分享你的想法..."
        rows={3}
        className="w-full px-3 py-2 bg-gray-50 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-wechat-green"
      />
      
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((url, index) => (
            <div key={index} className="relative">
              <img src={url} alt="" className="w-20 h-20 object-cover rounded" />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <label className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm text-gray-600">
            {uploading ? '上传中...' : '添加图片'}
          </span>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>

        <button
          onClick={handleSubmit}
          disabled={(!content.trim() && images.length === 0) || uploading}
          className="ml-auto px-6 py-1.5 bg-wechat-green text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
        >
          发布
        </button>
      </div>
    </div>
  );
}
