import { useState, useRef } from 'react';

export default function InputBar({ onSend, onImageSend, disabled }) {
  const [text, setText] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

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

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && onImageSend) {
      onImageSend(file);
    }
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Use browser SpeechRecognition if available
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.lang = 'zh-CN';
          recognition.continuous = false;
          
          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript.trim()) {
              onSend(transcript.trim());
            }
          };
          
          recognition.onerror = () => {
            alert('语音识别失败，请手动输入');
          };
          
          recognition.start();
        } else {
          alert('您的浏览器不支持语音识别');
        }
      };

      mediaRecorder.start();
      setRecording(true);
      setShowVoice(false);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Recording error:', error);
      alert('无法访问麦克风');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  if (recording) {
    return (
      <div className="h-[60px] bg-white border-t border-gray-200 flex items-center gap-2 px-4">
        <div className="flex-1 text-center">
          <span className="text-red-500 font-medium">🎙️ 录音中... {recordingTime}秒</span>
        </div>
        <button
          onClick={stopRecording}
          className="px-6 py-2 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors"
        >
          完成
        </button>
      </div>
    );
  }

  return (
    <div className="h-[60px] bg-white border-t border-gray-200 flex items-center gap-2 px-4">
      <button
        onClick={() => setShowVoice(!showVoice)}
        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-wechat-green"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息..."
        disabled={disabled}
        rows={1}
        className="flex-1 px-4 py-2 bg-gray-100 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-wechat-green disabled:opacity-50 max-h-[80px]"
        style={{ minHeight: '36px' }}
      />
      
      <button
        onClick={handleImageClick}
        disabled={disabled}
        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-wechat-green disabled:opacity-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />
      
      {showVoice && (
        <button
          onClick={startRecording}
          className="w-8 h-8 flex items-center justify-center text-wechat-green hover:text-green-600"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" />
          </svg>
        </button>
      )}
      
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="px-4 py-2 bg-wechat-green text-white rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
      >
        发送
      </button>
    </div>
  );
}
