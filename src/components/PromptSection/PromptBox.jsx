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
        placeholder="PLAIN WORDS DOESN'T WORK! Use the PROMPTIMIZE feature by the left."
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
      
      <div className="prompt-footer">
        <div className="left-tools">
          <AspectRatioDropdown 
            value={aspectRatio} 
            onChange={setAspectRatio} 
          />
        </div>
        
        <button
          className="generate-fab"
          onClick={onGenerate}
          disabled={!prompt.trim() || loading}
        >
          {loading ? <div className="spinner"></div> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
}
