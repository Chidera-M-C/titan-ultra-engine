import React, { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import './PromptBox.css';

export default function PromptBox({ prompt, setPrompt, aspectRatio, setAspectRatio, onGenerate, loading }) {
  const textareaRef = useRef(null);

  // Auto-resize textarea logic
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
          {/* ASPECT RATIO PILL */}
          <div className="tool-pill">
            <span className="pill-label">ASPECT RATIO</span>
            <span className="pill-value">{aspectRatio}</span>
            <select 
              value={aspectRatio} 
              onChange={(e) => setAspectRatio(e.target.value)}
              className="hidden-select"
            >
              <option value="2:3">2:3 Portrait</option>
              <option value="1:1">1:1 Square</option>
              <option value="16:9">16:9 Landscape</option>
            </select>
          </div>

          {/* MODEL PILL */}
          <div className="tool-pill">
            <span className="pill-label">MODEL</span>
            <span className="pill-value">v3.0</span>
          </div>
        </div>

        {/* THE SEND BUTTON */}
        <button 
          className="generate-fab" 
          onClick={onGenerate} 
          disabled={!prompt.trim() || loading} // .trim() prevents spaces-only bypass
        >
          {loading ? (
            <div className="spinner"></div>
          ) : (
            /* We leave out 'color' so the CSS :disabled state can change it */
            <Send size={20} strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
}
