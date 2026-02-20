import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import './PromptBox.css';

// Simple helper to render the visual shape icon based on ratio
const RatioIcon = ({ ratio }) => {
  const baseStyle = { border: '1.5px solid currentColor', borderRadius: '2px', opacity: 0.8 };
  switch (ratio) {
    case '1:1': return <div style={{ ...baseStyle, width: '12px', height: '12px' }} />;
    case '4:5': return <div style={{ ...baseStyle, width: '10px', height: '13px' }} />;
    case '16:9': return <div style={{ ...baseStyle, width: '15px', height: '9px' }} />;
    case '9:16': return <div style={{ ...baseStyle, width: '9px', height: '15px' }} />;
    default: return null;
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
      
      {!collapsed && (
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
                <option value="1:1">1:1</option>
                <option value="4:5">4:5</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
              </select>
              <span className="chevron">▾</span>
            </div>
          </div>
          
          <button
            className="generate-btn"
            onClick={onGenerate}
            disabled={!prompt.trim() || loading}
          >
            {loading ? <div className="spinner"></div> : <Send size={18} />}
          </button>
        </div>
      )}

      {collapsed && (
        <button
          className="generate-fab-mini"
          onClick={onGenerate}
          disabled={!prompt.trim() || loading}
        >
          {loading ? <div className="spinner"></div> : <Send size={18} />}
        </button>
      )}
    </div>
  );
}
