import React, { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import ToolPill from './ToolPill';

export default function PromptBox({ prompt, setPrompt, aspectRatio, setAspectRatio, onGenerate, loading }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt]);

  return (
    <div className="prompt-container">
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe what you want to see..."
        className="prompt-input"
        rows="1"
      />
      
      <div className="prompt-tools">
        <div className="left-tools">
          <ToolPill label="Aspect Ratio">
            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
              <option value="2:3">2:3 Portrait</option>
              <option value="1:1">1:1 Square</option>
              <option value="16:9">16:9 Landscape</option>
            </select>
            <span>{aspectRatio}</span>
          </ToolPill>

          <ToolPill label="Model" value="v3.0" />
        </div>

        <button 
          className="generate-fab" 
          onClick={onGenerate} 
          disabled={!prompt || loading}
        >
          {loading ? <div className="spinner"></div> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
