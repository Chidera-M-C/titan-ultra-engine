import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import ToolPill from './ToolPill';
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

    // Auto-grow height
    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    resize();

    // Custom scrollbar force (helps in some browsers)
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
      
      {/* Only show ONE button - either in tools or standalone */}
      {!collapsed ? (
        <div className="prompt-tools">
          <div className="left-tools">
            <ToolPill label="ASPECT RATIO" value={aspectRatio}>
              <select
                className="hidden-select"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="1:1">1:1 Square</option>
                <option value="2:3">2:3 Portrait</option>
                <option value="3:2">3:2 Landscape</option>
                <option value="4:5">4:5 Tall</option>
                <option value="16:9">16:9 Wide</option>
              </select>
            </ToolPill>
            
            <ToolPill label="MODEL" value="v3.0" />
          </div>
          
          <button
            className="generate-fab"
            onClick={onGenerate}
            disabled={!prompt.trim() || loading}
            title="Generate"
          >
            {loading ? <div className="spinner"></div> : <Send size={20} />}
          </button>
        </div>
      ) : (
        <button
          className="generate-fab"
          onClick={onGenerate}
          disabled={!prompt.trim() || loading}
          title="Generate"
        >
          {loading ? <div className="spinner"></div> : <Send size={20} />}
        </button>
      )}
    </div>
  );
}
