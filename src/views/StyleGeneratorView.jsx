import React, { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { PulseLoader } from '../components/Shared/Loader';
import AspectRatioDropdown from '../components/PromptSection/AspectRatioDropdown';
import './StyleGeneratorView.css';

export default function StyleGeneratorView({ mood, onBack, onGenerate, loading, image, error, credits }) {
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
              disabled={loading || credits < 2}
              style={{ background: mood.gradient }}
            >
              {loading ? <div className="spinner" /> : <><Send size={16} /> Generate</>}
            </button>
          </div>
        </div>
        {credits < 2 && (
          <p className="style-gen-credits-warn">Insufficient credits to generate</p>
        )}
      </div>

      {/* Result area */}
      <div className="style-gen-result">
        {!loading && !image && !error && (
          <div className="style-gen-placeholder">
            <div className="style-gen-placeholder-inner" style={{ background: mood.gradient }}>
              <span>{mood.title}</span>
            </div>
            <p>Your image will appear here</p>
          </div>
        )}

        {loading && (
          <div className="style-gen-loading">
            <PulseLoader />
            <p>Creating your {mood.title.toLowerCase()} image...</p>
          </div>
        )}

        {error && !loading && (
          <div className="style-gen-error">
            <AlertCircle size={28} color="#ff4444" />
            <p>{error}</p>
            <button className="retry-btn" onClick={handleGenerate}>Try Again</button>
          </div>
        )}

        {image && !loading && !error && (
          <div className="style-gen-image-wrap">
            <img src={image} alt={`${mood.title} generation`} className="style-gen-image" />
          </div>
        )}
      </div>
    </div>
  );
}
