import { useRef, useEffect } from 'react';

export function useTTS() {
  const utteranceRef = useRef(null);
  const enabledRef = useRef(false);

  const speak = (text) => {
    if (!enabledRef.current || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    // Try to find a Chinese voice
    const voices = window.speechSynthesis.getVoices();
    const chineseVoice = voices.find(v => v.lang.startsWith('zh'));
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const toggle = () => {
    enabledRef.current = !enabledRef.current;
    if (!enabledRef.current) {
      stop();
    }
    return enabledRef.current;
  };

  const isEnabled = () => enabledRef.current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return { speak, stop, toggle, isEnabled };
}
