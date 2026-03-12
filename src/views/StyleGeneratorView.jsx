import React, { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { PulseLoader } from '../components/Shared/Loader';
import AspectRatioDropdown from '../components/PromptSection/AspectRatioDropdown';
import './StyleGeneratorView.css';

export default function StyleGeneratorView({ mood, onBack, onGenerate, loading }) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');

  const finalPrompt = customPrompt.trim()
    ? `${customPrompt}, ${mood.prompt}`
    : mood.prompt;

  const handleGenerate = () => {
    onGenerate(finalPrompt, aspectRatio);
  };

  return (
    <div className="style-gen-view">
      {/* Header banner using mood gradient */}
      <div className="style-gen-banner" style={{ background: mood.gradient }}>
        <button className="style-gen-back" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Styles</span>
        </button>
        <div className="style-gen-mood-info">
          <h2 className="style-gen-title">{mood.title}</h2>
          <p className="style-gen-desc">{mood.description}</p>
        </div>
      </div>
    </div>
  );
}

      {/* Prompt input */}
      <div className="style-gen-prompt-section">
        <p className="style-gen-label">Add your own details <span>(optional)</span></p>
        <div className="style-gen-prompt-box">
          <textarea
            className="style-gen-textarea"
            placeholder={`e.g. "blonde woman on a rooftop" — the ${mood.title.toLowerCase()} mood will be applied automatically`}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            disabled={loading}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <div className="style-gen-footer">
            <AspectRatioDropdown value={aspectRatio} onChange={setAspectRatio} />
            <button
              className="style-gen-btn"
              onClick={handleGenerate}
              disabled={loading}
              style={{ background: mood.gradient }}
            >
              {loading ? <div className="spinner" /> : <><Send size={16} /> Generate</>}
            </button>
          </div>
        </div>
      </div>
  );
}
