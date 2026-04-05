import { useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import MessageBubble, { TypingIndicator } from './MessageBubble';
import InputBar from './InputBar';

export default function ChatView() {
  const { messages, sendMessage, isLoading } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="view-layout">
      {/* Messages */}
      <div className="view-content" id="messages-area" style={{ gap: 0 }}>
        <div className="chat-date-label">
          <span className="text-my">ဒီနေ့</span>
        </div>

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isNew={i === messages.length - 1 && msg.role === 'assistant' && messages.length > 1}
          />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <InputBar onSend={sendMessage} disabled={isLoading} />

      <style>{`
        .chat-date-label {
          text-align: center;
          margin: 0 0 12px 0;
        }
        .chat-date-label span {
          display: inline-block;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          padding: 2px 12px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
