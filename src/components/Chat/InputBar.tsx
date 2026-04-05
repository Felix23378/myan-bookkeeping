import React, { useState, useRef, useCallback } from 'react';
import { Mic, Send, Square } from 'lucide-react';

interface InputBarProps {
  onSend: (text: string, audio?: Blob) => void;
  disabled?: boolean;
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        onSend('🎤 Voice message', blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch {
      alert('Microphone ကို ခွင့်မပြုပါ။ Browser settings မှာ microphone ခွင့်ပြုပါ။');
    }
  }, [onSend]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="input-bar">
      {recording ? (
        <div className="recording-indicator">
          <div className="rec-dot" />
          <span className="text-my" style={{ fontSize: '0.9rem', color: 'var(--expense)' }}>
            {formatDuration(recordingDuration)} ရေဒီယို...
          </span>
          <div style={{ flex: 1 }} />
          <button
            id="btn-stop-recording"
            className="btn-record btn-stop"
            onClick={stopRecording}
          >
            <Square size={16} fill="currentColor" />
            ရပ်မည်
          </button>
        </div>
      ) : (
        <div className="input-row">
          <textarea
            id="chat-input"
            ref={textareaRef}
            className="chat-textarea text-my"
            placeholder="ဒီနေ့ ဘာရောင်းရသလဲ၊ ဘာဝယ်ရသလဲ ပြောပါ..."
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
          />
          <div className="input-actions">
            {text.trim() ? (
              <button
                id="btn-send"
                className="btn-send"
                onClick={handleSend}
                disabled={disabled}
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                id="btn-voice"
                className="btn-record btn-mic"
                onClick={startRecording}
                disabled={disabled}
                aria-label="Voice input"
              >
                <Mic size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .input-bar {
          min-height: var(--input-bar-height);
          padding: 6px 12px;
          background: rgba(22,27,34,0.98);
          border-top: 1px solid var(--border);
        }
        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 4px 4px 4px 14px;
          transition: border-color var(--transition);
        }
        .input-row:focus-within { border-color: var(--accent); }
        .chat-textarea {
          flex: 1;
          background: transparent;
          color: var(--text-primary);
          font-size: 1rem; /* Must be 16px to prevent iOS zoom */
          line-height: 1.45;
          resize: none;
          max-height: 96px;
          padding: 2px 0;
          min-height: 24px;
        }
        .chat-textarea::placeholder { color: var(--text-disabled); }
        .input-actions { display: flex; align-items: center; }
        .btn-send {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: var(--accent);
          color: #0D1117;
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer;
          transition: all var(--transition);
          flex-shrink: 0;
        }
        .btn-send:hover { background: var(--accent-hover); transform: scale(1.08); }
        .btn-send:disabled { opacity: 0.5; transform: none; }
        .btn-record {
          display: flex; align-items: center; gap: 6px;
          border: none; cursor: pointer;
          border-radius: var(--radius-full);
          font-family: var(--font-burmese);
          font-size: 0.875rem;
          font-weight: 500;
          transition: all var(--transition);
        }
        .btn-mic {
          width: 34px; height: 34px;
          justify-content: center;
          background: var(--bg-card);
          color: var(--text-muted);
        }
        .btn-mic:hover { background: var(--accent-dim); color: var(--accent); }
        .btn-stop {
          padding: 8px 16px;
          background: var(--expense-dim);
          color: var(--expense);
          border: 1px solid rgba(239,68,68,0.2);
          animation: recordPulse 1.5s infinite;
        }
        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 8px;
        }
        .rec-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: var(--expense);
          animation: recordPulse 1s infinite;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
