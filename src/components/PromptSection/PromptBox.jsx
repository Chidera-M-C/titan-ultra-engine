import React, { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import './PromptBox.css';

const aspectRatioOptions = [
  { value: '1:1', label: '1:1 Square' },
  { value: '2:3', label: '2:3 Portrait' },
  { value: '3:4', label: '3:4 Portrait' },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '9:16', label: '9:16 Vertical' },
];

export default function PromptBox({ prompt, setPrompt, aspectRatio, setAspectRatio, onGenerate, loading }) {
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const currentLabel = aspectRatioOptions.find(opt => opt.value === aspectRatio)?.label || aspectRatio;

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
            <span className="pill-value">{currentLabel}</span>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="hidden-select"
            >
              {aspectRatioOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* MODEL PILL (static for now) */}
          <div className="tool-pill">
            <span className="pill-label">MODEL</span>
            <span className="pill-value">v3.0</span>
          </div>
        </div>

        {/* GENERATE BUTTON */}
        <button
          className="generate-fab"
          onClick={onGenerate}
          disabled={!prompt.trim() || loading}
        >
          {loading ? (
            <div className="spinner" />
          ) : (
            <Send size={32} strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
}
