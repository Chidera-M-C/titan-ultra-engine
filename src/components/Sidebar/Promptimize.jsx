import React, { useState, useRef, useEffect } from 'react';
import { Wand2, Copy, ArrowUpRight, Check, AlertCircle, Brain } from 'lucide-react';
import './Promptimize.css';

export default function Promptimize({ onLoad, onNegativePromptLoad, currentPrompt, currentNegativePrompt }) {
  const [input, setInput]               = useState('');
  const [output, setOutput]             = useState('');
  const [negativeOutput, setNegativeOutput] = useState('');
  const [thinking, setThinking]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [copied, setCopied]             = useState(false);
  const [copiedNeg, setCopiedNeg]       = useState(false);
  const [error, setError]               = useState(null);
  const [thinkDone, setThinkDone]       = useState(false);
  const [buildDone, setBuildDone]       = useState(false);

  const thinkBoxRef = useRef(null);

  useEffect(() => {
    if (thinkBoxRef.current) {
      thinkBoxRef.current.scrollTop = thinkBoxRef.current.scrollHeight;
    }
  }, [thinking]);

  const handleRun = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setOutput('');
    setNegativeOutput('');
    setThinking('');
    setThinkDone(false);
    setBuildDone(false);
    setError(null);

    try {
      const response = await fetch('/api/promptimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: input }),
      });

      if (!response.ok) throw new Error('Failed to optimize prompt. Please try again.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          let parsed;
          try { parsed = JSON.parse(jsonStr); }
          catch { continue; }

          if (parsed.error) throw new Error(parsed.error);

          // Call 1 — thinking stream
          if (parsed.type === 'thinking' && parsed.chunk) {
            setThinking(prev => prev + parsed.chunk);
          }

          // Call 1 done
          if (parsed.type === 'thinking_done') {
            setThinkDone(true);
          }

          // Call 2 — positive prompt result
          if (parsed.type === 'result') {
            setOutput(parsed.optimized || '');
            setBuildDone(true);
          }

          // Call 3 — negative prompt result
          if (parsed.type === 'negative') {
            setNegativeOutput(parsed.negative || '');
          }
        }
      }
    } catch (err) {
      console.error('Promptimize Error:', err);
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

  const handleCopyNeg = () => {
    if (!negativeOutput) return;
    navigator.clipboard.writeText(negativeOutput);
    setCopiedNeg(true);
    setTimeout(() => setCopiedNeg(false), 2000);
  };

  const isLoaded =
    output &&
    (currentPrompt || '').trim() === output.trim() &&
    (!negativeOutput || (currentNegativePrompt || '').trim() === negativeOutput.trim());

  const handleLoadToggle = () => {
    if (!output) return;
    if (isLoaded) {
      onLoad?.('');
      onNegativePromptLoad?.('');
    } else {
      onLoad?.(output);
      if (negativeOutput) onNegativePromptLoad?.(negativeOutput);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const showThinkBox = loading || (thinkDone && thinking);

  const loadingLabel = loading && buildDone
    ? 'Building negative...'
    : loading && thinkDone
    ? 'Building prompt...'
    : 'Thinking...';

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
          placeholder="Imagine any scene... we'll turn it into a prompt"
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
          <><div className="promptimize-spinner" /><span>{loadingLabel}</span></>
        ) : (
          <><Wand2 size={13} /><span>Promptimize It</span></>
        )}
      </button>

      {error && (
        <div className="promptimize-error">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}

      {/* THINKING BOX — Call 1 stream */}
      {showThinkBox && (
        <div className={`promptimize-think-box ${thinkDone ? 'think-done' : 'think-active'}`}>
          <div className="think-box-header">
            <Brain size={11} className={!thinkDone ? 'brain-pulse' : ''} />
            <span>{!thinkDone ? 'Thinking...' : 'Thought process'}</span>
            {thinkDone && <span className="think-done-badge">✓ done</span>}
          </div>
          <div className="think-box-content" ref={thinkBoxRef}>
            {thinking || '...'}
          </div>
        </div>
      )}

      {/* OUTPUT — Call 2 positive prompt */}
      {output && (
        <div className="promptimize-output">
          <div className="promptimize-output-label">Optimized Prompt</div>
          <p className="promptimize-output-text">{output}</p>

          {/* DIVIDER */}
          {negativeOutput && <div className="promptimize-output-divider" />}

          {/* NEGATIVE PROMPT — Call 3 */}
          {negativeOutput && (
            <>
              <div className="promptimize-output-label neg-label">Negative Prompt</div>
              <p className="promptimize-output-text">{negativeOutput}</p>
              <div className="promptimize-neg-copy">
                <button
                  className={`promptimize-action-btn copy ${copiedNeg ? 'copied' : ''}`}
                  onClick={handleCopyNeg}
                >
                  {copiedNeg ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedNeg ? 'Copied' : 'Copy Negative'}</span>
                </button>
              </div>
            </>
          )}

          {/* ACTIONS */}
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
              <ArrowUpRight size={13} />
              <span>{isLoaded ? 'Unload' : 'Load'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
