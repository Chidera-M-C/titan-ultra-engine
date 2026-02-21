import React, { useState } from 'react';
import { Wand2, Copy, ArrowUpRight, Check, AlertCircle, RotateCcw } from 'lucide-react';
import './Promptimize.css';

export default function Promptimize({ onLoad, currentPrompt }) {
  const [input, setInput]   = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError]   = useState(null);

  const handleRun = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setOutput('');
    setError(null);

    try {
      const response = await fetch('/api/promptimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: input }),
      });

      if (!response.ok) throw new Error('Failed to optimize prompt. Please try again.');

      const data = await response.json();
      if (data.optimized) {
        setOutput(data.optimized);
      } else {
        throw new Error('No optimization returned.');
      }
    } catch (err) {
      console.error("Promptimize Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoaded = output && (currentPrompt || '').trim() === output.trim();

  const handleLoadToggle = () => {
    if (!output || !onLoad) return;
    if (isLoaded) {
      onLoad(''); // unload
    } else {
      onLoad(output); // load
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

      {error && (
        <div className="promptimize-error">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}

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
              className={`promptimize-action-btn load ${isLoaded ? 'loaded' : ''}`}
              onClick={handleLoadToggle}
            >
              <RotateCcw size={13} />
              <span>{isLoaded ? 'Unload' : 'Load'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
