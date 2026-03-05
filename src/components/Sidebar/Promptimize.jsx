import React, { useState } from 'react';
import { Wand2, Copy, ArrowUpRight, Check, AlertCircle } from 'lucide-react';
import './Promptimize.css';

export default function Promptimize({ onLoad, currentPrompt }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [thinking, setThinking] = useState('');   // ← New state
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setOutput('');
    setThinking('');
    setError(null);

    try {
      const response = await fetch('/api/promptimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: input }),
      });

      if (!response.ok) throw new Error('Failed to optimize prompt.');

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setThinking(data.thinking || 'No thinking trace available.');
      setOutput(data.optimized || '');

      if (!data.optimized) {
        setError('No optimized prompt returned.');
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
      onLoad('');
    } else {
      onLoad(output);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="promptimize-wrapper">
      {/* ... header, input, run button stay the same ... */}

      {error && (
        <div className="promptimize-error">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}

      {output && (
        <div className="promptimize-output">
          {/* New Thinking Box */}
          {thinking && (
            <div className="promptimize-thinking">
              <div className="promptimize-thinking-label">Model Thinking Process</div>
              <div className="promptimize-thinking-content">
                {thinking}
              </div>
            </div>
          )}

          <div className="promptimize-output-label">Optimized Prompt</div>
          <p className="promptimize-output-text">{output}</p>

          <div className="promptimize-output-actions">
            {/* copy & load buttons stay the same */}
          </div>
        </div>
      )}
    </div>
  );
}
