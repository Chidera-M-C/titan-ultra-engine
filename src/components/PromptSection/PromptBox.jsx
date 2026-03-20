import React, { useRef, useEffect } from 'react';
import { Send, ArrowDownLeft } from 'lucide-react';
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
  onOpenSidebar,
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
      <div className="prompt-inputs-row">

        {/* ── Main prompt box ─────────────────────────────────────────── */}
        <div className="prompt-input-block prompt-input-main">
          <p className="prompt-negative-label prompt-spacer">Prompt</p>
          <div className="prompt-input-main-box">
            <textarea
              ref={textareaRef}
              className="prompt-input"
              placeholder={collapsed ? 'Describe what you want to create...' : 'Describe what you wanna see...'}
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
            <div className="prompt-hint-row">
              <p className="prompt-hint mobile-sidebar-trigger" onClick={onOpenSidebar}>
                Plain words don't work! Promptimize it <ArrowDownLeft size={11} />
              </p>
            </div>
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

        {/* ── Negative prompt box — hidden when collapsed ──────────────── */}
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
    </div>
  );
}
