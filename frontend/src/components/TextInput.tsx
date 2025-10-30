import { useState } from 'react';
import type { KeyboardEvent } from 'react';

interface TextInputProps {
  onSend: (message: string) => void;
  onVoiceClick: () => void;
  disabled?: boolean;
}

export const TextInput = ({ onSend, onVoiceClick, disabled }: TextInputProps) => {
  const [message, setMessage] = useState('');
  
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };
  
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="flex items-end gap-2">
      {/* Voice Button */}
      <button
        onClick={onVoiceClick}
        disabled={disabled}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface-800 text-text-secondary transition-all hover:bg-surface-750 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
        title="Switch to voice input"
      >
        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
      
      {/* Text Input */}
      <div className="flex-1 relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={disabled}
          placeholder="Type your question here… (Shift+Enter for new line)"
          className="w-full resize-none rounded-xl border border-white/10 bg-surface-900/80 px-4 py-2.5 pr-12 text-sm text-text-primary placeholder-text-tertiary outline-none transition-all focus:border-accent-blue/50 focus:bg-surface-900 disabled:cursor-not-allowed disabled:opacity-40"
          rows={1}
          style={{
            minHeight: '42px',
            maxHeight: '120px',
          }}
        />
        
        {/* Character count (optional) */}
        {message.length > 0 && (
          <div className="absolute bottom-2 right-12 text-[10px] text-text-tertiary">
            {message.length}
          </div>
        )}
      </div>
      
      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-blue text-white transition-all hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-text-tertiary"
        title="Send message"
      >
        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  );
};
