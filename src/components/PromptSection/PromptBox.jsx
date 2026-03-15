import React, { useRef, useEffect } from 'react';
import { Send, CornerLeftUp } from 'lucide-react';
import AspectRatioDropdown from './AspectRatioDropdown';
import './PromptBox.css';

export default function PromptBox({
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  onGenerate,
  loading,
  collapsed = false,
  negativePrompt,
  setNegativePrompt,
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
      {collapsed ? (
        // ── Collapsed: single row ─────────────────────────────────────────
        <>
          <textarea
            ref={textareaRef}
            className="prompt-input"
            placeholder="Describe what you want to create..."
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
              <AspectRatioDropdown value={aspectRatio} onChange={setAspectRatio} />
            </div>
            <button
              className="generate-fab"
              onClick={onGenerate}
              disabled={!prompt.trim() || loading}
            >
              {loading ? <div className="spinner"></div> : <Send size={20} />}
            </button>
          </div>
        </>
      ) : (
        // ── Expanded: side by side prompt + negative ──────────────────────
        <div className="prompt-inputs-row">
          <div className="prompt-input-block prompt-input-main">
            <p className="prompt-negative-label" style={{ visibility: 'hidden' }}>Prompt</p>  {/* spacer */}
            <div className="prompt-input-main-box">
            <textarea
              ref={textareaRef}
              className="prompt-input"
              placeholder="What would you like to see..."
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
            <p className="prompt-hint">Plain words don't work! Use Promptimize <CornerLeftUp size={11} /></p>
            <div className="prompt-footer">
              <div className="left-tools">
                <AspectRatioDropdown value={aspectRatio} onChange={setAspectRatio} />
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
          </div>
            

          <div className="prompt-input-block prompt-input-negative">
            <p className="prompt-negative-label">Negative prompt</p>
            <div className="prompt-negative-box">
              <textarea
                className="prompt-negative-textarea"
                placeholder="What to avoid (e.g. blurry, bad hands, extra fingers, low quality...)"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
