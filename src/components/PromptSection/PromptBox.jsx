import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import './PromptBox.css';

// SVG icons with hard-coded white fills to ensure they render
const RatioIcon = ({ ratio }) => {
  switch (ratio) {
    case '1:1': 
      return <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0 }}><rect width="12" height="12" rx="1" fill="#FFFFFF" /></svg>;
    case '4:5': 
      return <svg width="10" height="12" viewBox="0 0 10 12" style={{ flexShrink: 0 }}><rect width="10" height="12" rx="1" fill="#FFFFFF" /></svg>;
    case '9:16': 
      return <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0 }}><rect width="8" height="14" rx="1" fill="#FFFFFF" /></svg>;
    case '16:9': 
      return <svg width="14" height="8" viewBox="0 0 14 8" style={{ flexShrink: 0 }}><rect width="14" height="8" rx="1" fill="#FFFFFF" /></svg>;
    default: 
      return <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0 }}><rect width="12" height="12" rx="1" fill="#FFFFFF" /></svg>;
  }
};

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
    textarea.style.scrollbarWidth = 'thin';
    textarea.style.scrollbarColor = '#2A2A2A #161616';

    textarea.addEventListener('input', resize);
    window.addEventListener('resize', resize);

    return () => {
      textarea.removeEventListener('input', resize);
      window.removeEventListener('resize', resize);
    };
  }, [prompt, collapsed]);

  return (
    <div className={`prompt-container ${collapsed ? 'collapsed' : ''}`}>
      <textarea
        ref={textareaRef}
        className="prompt-input"
        placeholder="Describe what you want to see..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={loading}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onGenerate();
          }
        }}
      />
      
      {!collapsed ? (
        <div className="prompt-footer">
          <div className="left-tools">
            <div className="aspect-pill">
              <RatioIcon ratio={aspectRatio} />
              <span className="aspect-value">{aspectRatio}</span>
              <select
                className="hidden-select"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="1:1">⬛ 1:1</option>
                <option value="4:5">▭ 4:5</option>
                <option value="9:16">▯ 9:16</option>
                <option value="16:9">▬ 16:9</option>
              </select>
            </div>
          </div>
          
          <button
            className="generate-fab"
            onClick={onGenerate}
            disabled={!prompt.trim() || loading}
          >
            {loading ? <div className="spinner"></div> : <Send size={20} />}
          </button>
        </div>
      ) : (
        <button
          className="generate-fab"
          onClick={onGenerate}
          disabled={!prompt.trim() || loading}
        >
          {loading ? <div className="spinner"></div> : <Send size={20} />}
        </button>
      )}
    </div>
  );
}
