// src/components/Sidebar/Promptimize.jsx
import React, { useState } from 'react';
import { Wand2, Copy, ArrowUpRight, Check } from 'lucide-react';
import './Promptimize.css';

export default function Promptimize({ onLoad }) {
  const [input, setInput]     = useState('');
  const [output, setOutput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const handleRun = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setOutput('');

    // TODO: wire up LLM call here
    // placeholder so UI is testable
    await new Promise(r => setTimeout(r, 1200));
    setOutput('[ optimized prompt will appear here ]');

    setLoading(false);
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoad = () => {
    if (!output || !onLoad) return;
    onLoad(output);
  };

  return (
    <div className="promptimize-wrapper">
      <div className="promptimize-header">
        <div className="promptimize-icon">
          <Wand2 size={14} color="#fff" />
        </div>
        <span className="promptimize-title">Promptimize</span>
        <span className="promptimize-badge">Beta</span>
      </div>

      <div className="promptimize-input-wrapper">
        <textarea
          className="promptimize-input"
          placeholder="Describe a scene or idea... e.g. woman in rain at night"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
      </div>

      <button
        className="promptimize-run-btn"
        onClick={handleRun}
        disabled={!input.trim() || loading}
      >
        {loading ? (
          <>
            <div className="promptimize-spinner" />
            <span>Optimizing...</span>
          </>
        ) : (
          <>
            <Wand2 size={13} />
            <span>Promptimize It</span>
          </>
        )}
      </button>

      {output && (
        <div className="promptimize-output">
          <div className="promptimize-output-label">Optimized Prompt</div>
          <p className="promptimize-output-text">{output}</p>
          <div className="promptimize-output-actions">
            <button
              className={`promptimize-action-btn copy ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              className="promptimize-action-btn load"
              onClick={handleLoad}
            >
              <ArrowUpRight size={13} />
              <span>Load</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
