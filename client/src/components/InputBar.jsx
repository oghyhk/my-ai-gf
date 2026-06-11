import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

export default function InputBar({ onSend, disabled, onVoiceToggle, voiceEnabled }) {
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    onSend(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别，请使用Chrome或Edge浏览器');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setRecording(true);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setMessage(prev => prev + finalTranscript);
      }
      setTranscript(interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
      setTranscript('');
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
  };

  return (
    <div className="bg-white border-t border-gray-200 p-3">
      <div className="flex items-end gap-2">
        <button
          onClick={onVoiceToggle}
          className={`p-2 rounded-lg transition-colors ${
            voiceEnabled
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={voiceEnabled ? '关闭语音播报' : '开启语音播报'}
        >
          {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>

        <button
          onClick={toggleRecording}
          className={`p-2 rounded-lg transition-colors ${
            recording
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={recording ? '停止录音' : '语音输入'}
        >
          {recording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <form onSubmit={handleSubmit} className="flex-1 flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={recording ? '正在听你说话...' : '输入消息...'}
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {transcript && (
              <div className="absolute bottom-full left-0 right-0 mb-1 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg">
                {transcript}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
