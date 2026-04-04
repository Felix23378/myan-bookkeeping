import { Bot } from 'lucide-react';
import type { ChatMessage } from '../../hooks/useChat';

interface MessageBubbleProps {
  message: ChatMessage;
  isNew?: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('my-MM', { hour: '2-digit', minute: '2-digit' });
}

function renderContent(content: string) {
  // Convert **bold** and newlines
  const lines = content.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export default function MessageBubble({ message, isNew = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`bubble-wrapper ${isUser ? 'bubble-user' : 'bubble-assistant'} ${isNew ? 'bubble-new' : ''}`}
    >
      {!isUser && (
        <div className="bubble-avatar">
          <Bot size={14} />
        </div>
      )}
      <div className={`bubble ${isUser ? 'bubble-right' : 'bubble-left'}`}>
        <p className="bubble-text text-my">{renderContent(message.content)}</p>
        <span className="bubble-time">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="bubble-wrapper bubble-assistant bubble-new">
      <div className="bubble-avatar">
        <Bot size={14} />
      </div>
      <div className="bubble bubble-left bubble-typing">
        <span /><span /><span />
      </div>
    </div>
  );
}

// Inline styles for bubble module
const style = document.createElement('style');
style.textContent = `
  .bubble-wrapper {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-bottom: 6px;
    padding: 0 4px;
  }
  .bubble-user { flex-direction: row-reverse; }
  .bubble-assistant { flex-direction: row; }
  .bubble-new { animation: slideInLeft 0.25s ease forwards; }
  .bubble-user.bubble-new { animation: slideInRight 0.25s ease forwards; }
  .bubble-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), #D97706);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0D1117;
    flex-shrink: 0;
    margin-bottom: 4px;
  }
  .bubble {
    max-width: min(75%, 320px);
    padding: 10px 14px;
    border-radius: 18px;
    position: relative;
    word-break: break-word;
  }
  .bubble-right {
    background: linear-gradient(135deg, var(--accent), #D97706);
    color: #0D1117;
    border-bottom-right-radius: 4px;
  }
  .bubble-left {
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-primary);
    border-bottom-left-radius: 4px;
  }
  .bubble-text {
    font-size: 0.9375rem;
    line-height: 1.7;
    color: inherit;
    margin: 0;
  }
  .bubble-right .bubble-text { color: #0D1117; }
  .bubble-time {
    font-size: 0.6875rem;
    opacity: 0.6;
    display: block;
    margin-top: 4px;
    text-align: right;
    font-family: var(--font-ui);
  }
  .bubble-right .bubble-time { color: rgba(13,17,23,0.7); }
  .bubble-typing {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 14px 18px;
    min-width: 60px;
  }
  .bubble-typing span {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--text-muted);
    animation: typingBounce 1.2s infinite;
  }
  .bubble-typing span:nth-child(2) { animation-delay: 0.2s; }
  .bubble-typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-6px); opacity: 1; }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('bubble-styles')) {
  style.id = 'bubble-styles';
  document.head.appendChild(style);
}
