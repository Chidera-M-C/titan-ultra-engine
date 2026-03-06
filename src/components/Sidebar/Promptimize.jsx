import React, { useState, useRef, useEffect } from 'react';
import { Wand2, Copy, ArrowUpRight, Check, AlertCircle, Brain } from 'lucide-react';
import './Promptimize.css';

export default function Promptimize({ onLoad, currentPrompt }) {
  const [input, setInput]         = useState('');
  const [output, setOutput]       = useState('');
  const [thinking, setThinking]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const [error, setError]         = useState(null);
  const [thinkDone, setThinkDone] = useState(false);

  const thinkBoxRef = useRef(null);

  // Auto-scroll think box as content streams in
  useEffect(() => {
    if (thinkBoxRef.current) {
      thinkBoxRef.current.scrollTop = thinkBoxRef.current.scrollHeight;
    }
  }, [thinking]);

  const handleRun = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setOutput('');
    setThinking('');
    setThinkDone(false);
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
        buffer = lines.pop(); // hold incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          let parsed;
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            console.warn('SSE parse error, skipping line:', jsonStr);
            continue;
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }

          // type: 'thinking' — stream reasoning chunks into think box
          if (parsed.type === 'thinking' && parsed.chunk) {
            setThinking(prev => prev + parsed.chunk);
          }

          // type: 'thinking_done' — Call 1 finished, Call 2 is running
          if (parsed.type === 'thinking_done') {
            setThinkDone(true);
          }

          // type: 'result' — Call 2 finished, show final prompt
          if (parsed.type === 'result') {
            setOutput(parsed.optimized || '');
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

  const isLoaded = output && (currentPrompt || '').trim() === output.trim();

  const handleLoadToggle = () => {
    if (!output || !onLoad) return;
    if (isLoaded) {
      onLoad('');
    } else {
      onLoad(output);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Think box visible while loading OR after if thinking content exists
  const showThinkBox = loading || (thinkDone && thinking);

  // Loading has two phases now — thinking (Call 1) and building (Call 2)
  const loadingLabel = loading && thinkDone ? 'Building prompt...' : 'Thinking...';

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
          <>
            <div className="promptimize-spinner" />
            <span>{loadingLabel}</span>
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

      {/* THINKING BOX — streams Call 1 live */}
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

      {/* OUTPUT — only shown after Call 2 returns result */}
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
              <ArrowUpRight size={13} />
              <span>{isLoaded ? 'Unload' : 'Load'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
