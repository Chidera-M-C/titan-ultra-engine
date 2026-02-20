import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import AspectRatioDropdown from './AspectRatioDropdown';
import './PromptBox.css';

export default function PromptBox({
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  onGenerate,
  loading,
  collapsed = false
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    resize();

    textarea.addEventListener('input', resize);
    window.addEventListener('resize', resize);

    return () => {
      textarea.removeEventListener('input', resize);
      window.removeEventListener('resize', resize);
    };
  }, [prompt, collapsed]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onGenerate();
    }
  };

  const SendButton = () => (
    <button
      className="generate-fab"
      onClick={onGenerate}
      disabled={!prompt.trim() || loading}
    >
      {loading ? <div className="spinner" /> : <Send size={20} />}
    </button>
  );

  const textarea = (
    <textarea
      ref={textareaRef}
      className="prompt-input"
      placeholder="Describe what you want to see..."
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      disabled={loading}
      onKeyDown={handleKeyDown}
    />
  );

  return (
    <div className={`prompt-container ${collapsed ? 'collapsed' : ''}`}>
      {collapsed ? (
        <>
          {textarea}
          <SendButton />
        </>
      ) : (
        <>
          {textarea}
          <div className="prompt-footer">
            <div className="left-tools">
              <AspectRatioDropdown
                value={aspectRatio}
                onChange={setAspectRatio}
              />
            </div>
            <SendButton />
          </div>
        </>
      )}
    </div>
  );
}
