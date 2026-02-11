import React, { useEffect, useRef } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import ToolPill from './ToolPill';

export default function PromptBox({ 
  prompt, 
  setPrompt, 
  aspectRatio, 
  setAspectRatio, 
  onGenerate, 
  loading 
}) {
  const textareaRef = useRef(null);

  // Auto-resize logic (Preserved from your original code)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [prompt]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onGenerate();
    }
  };

  return (
    <div className="prompt-container">
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe what you want to see..."
        className="prompt-input"
        onKeyDown={handleKeyDown}
      />
      
      <div className="prompt-tools">
        <div className="left-tools">
          {/* Aspect Ratio Pill */}
          <ToolPill label="Aspect Ratio" showIcon={true}>
            <select 
              value={aspectRatio} 
              onChange={(e) => setAspectRatio(e.target.value)}
              className="pill-select" // Ensure this class exists in CSS or inherits default styles
            >
              <option value="2:3">2:3 Portrait</option>
              <option value="1:1">1:1 Square</option>
              <option value="16:9">16:9 Landscape</option>
            </select>
          </ToolPill>

          {/* Model Version Pill (Static for now) */}
          <ToolPill label="Model" value="v3.0" />
        </div>

        <div className="right-tools">
          <button 
            className="generate-fab" 
            onClick={onGenerate} 
            disabled={!prompt || loading}
          >
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <Send size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
