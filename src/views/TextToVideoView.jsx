// src/views/TextToVideoView.jsx
import React, { useState } from 'react';
import { Send, Video, UserPlus, X, Check, Clapperboard, Zap } from 'lucide-react';
import AspectRatioDropdown from '../components/PromptSection/AspectRatioDropdown';
import VideoStylePicker from '../components/Video/VideoStylePicker';
import VideoControls from '../components/Video/VideoControls';
import CreateCharacterModal from '../components/Shared/CreateCharacterModal';
import './TextToVideoView.css';
import '../components/PromptSection/PromptBox.css';

function CharacterPicker({ characters, selectedCharacter, onSelect, onClose, onCharacterCreated }) {
  const [showCreate, setShowCreate] = useState(false);
  return (
    <>
      {!showCreate && (
        <div className="char-picker-overlay" onClick={onClose}>
          <div className="char-picker" onClick={e => e.stopPropagation()}>
            <div className="char-picker-header">
              <p className="char-picker-title">Select Character</p>
              <button className="char-picker-close" onClick={onClose}><X size={14} /></button>
            </div>
            <div className="char-picker-grid">
              {characters.map(char => (
                <button key={char.id}
                  className={`char-picker-item ${selectedCharacter?.id === char.id ? 'selected' : ''}`}
                  onClick={() => { onSelect(char); onClose(); }}
                >
                  <div className="char-picker-photo">
                    {char.photo_url ? <img src={char.photo_url} alt={char.name} /> : <div className="char-picker-placeholder" />}
                    {selectedCharacter?.id === char.id && <div className="char-picker-check"><Check size={10} /></div>}
                  </div>
                  <span className="char-picker-name">{char.name}</span>
                </button>
              ))}
              <button className="char-picker-create" onClick={() => setShowCreate(true)}>
                <div className="char-picker-create-icon"><UserPlus size={20} /></div>
                <span className="char-picker-name">New</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {showCreate && (
        <CreateCharacterModal onClose={() => setShowCreate(false)}
          onCreated={(c) => { if (onCharacterCreated) onCharacterCreated(c); setShowCreate(false); onClose(); }} />
      )}
    </>
  );
}

export default function TextToVideoView({
  onGenerate, loading, error, result,
  selectedCharacter, onSelectCharacter, characters, onCharacterCreated,
}) {
  const [prompt, setPrompt]             = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio]   = useState('9:16');
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [duration, setDuration]         = useState(4);
  const [motionStrength, setMotionStrength] = useState(0.7);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showCharPicker, setShowCharPicker]   = useState(false);

  const lockScroll = () => {
    const el = document.querySelector('.scrollable-area');
    if (el) el.style.overflow = 'hidden';
  };
  const unlockScroll = () => {
    const el = document.querySelector('.scrollable-area');
    if (el) el.style.overflow = '';
  };

  const canGenerate = prompt.trim() && selectedStyle && !loading;

  const handleGenerate = () => {
    if (!canGenerate) return;
    onGenerate({
      type: 'text_to_video',
      prompt,
      negativePrompt,
      aspectRatio,
      style: selectedStyle.id,
      duration,
      motionStrength,
      character: selectedCharacter ? {
        name: selectedCharacter.name,
        race: selectedCharacter.race,
        body_type: selectedCharacter.body_type,
      } : null,
      face_embedding: selectedCharacter?.face_embedding || null,
    });
  };

  return (
    <div className="t2v-view">
      <div className="t2v-header">
        <h1 className="t2v-title">Text → Video</h1>
        <p className="t2v-subtitle">Describe your video and let AI bring it to life</p>
      </div>

      <div className="t2v-inputs-row">
        {/* Main prompt */}
        <div className="t2v-input-block t2v-input-main">
          <p className="t2v-label">Prompt</p>
          <div className="t2v-prompt-box">
            <textarea
              className="t2v-textarea"
              placeholder="Describe the video you want to create..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={loading}
              rows={4}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
            />
            <div className="t2v-footer">
              <div className="t2v-footer-left">
                <AspectRatioDropdown value={aspectRatio} onChange={setAspectRatio} />

                {/* Character */}
                {selectedCharacter ? (
                  <div className="char-pill">
                    <img src={selectedCharacter.photo_url} alt={selectedCharacter.name} className="char-pill-photo" />
                    <span className="char-pill-name btn-label">{selectedCharacter.name}</span>
                    <button className="char-pill-remove" onClick={() => onSelectCharacter(null)}><X size={10} /></button>
                  </div>
                ) : (
                  <button className="char-add-btn" onClick={() => { setShowCharPicker(true); lockScroll(); }}>
                    <UserPlus size={14} /><span className="btn-label">Character</span>
                  </button>
                )}

                {/* Style */}
                {selectedStyle ? (
                  <div className="vstyle-pill" onClick={() => { setShowStylePicker(true); lockScroll(); }}>
                    <span>{selectedStyle.emoji}</span>
                    <span className="vstyle-pill-name btn-label">{selectedStyle.title}</span>
                    <button className="char-pill-remove" onClick={e => { e.stopPropagation(); setSelectedStyle(null); }}><X size={10} /></button>
                  </div>
                ) : (
                  <button className={`char-add-btn ${!selectedStyle ? 'vstyle-required' : ''}`} onClick={() => { setShowStylePicker(true); lockScroll(); }}>
                    <Clapperboard size={14} /><span className="btn-label">Style *</span>
                  </button>
                )}
              </div>

              <button
                className="t2v-generate-btn"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                {loading ? <div className="spinner" /> : <><Video size={16} /><span className="btn-label"> Generate</span><Zap size={12} fill="currentColor" />30</>}
              </button>
            </div>
          </div>
        </div>

        {/* Negative prompt */}
        <div className="t2v-input-block t2v-input-negative">
          <p className="t2v-label">Negative prompt</p>
          <div className="t2v-prompt-box t2v-negative-box">
            <textarea
              className="t2v-textarea t2v-negative"
              placeholder="What to avoid..."
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
          <VideoControls
            duration={duration}
            setDuration={setDuration}
            motionStrength={motionStrength}
            setMotionStrength={setMotionStrength}
            disabled={loading}
          />
        </div>
      </div>

      {/* Result */}
      {(loading || result || error) && (
        <div className="t2v-result">
          {loading && (
            <div className="t2v-loading">
              <div className="t2v-loading-spinner" />
              <p>Generating your video... this may take a minute</p>
            </div>
          )}
          {error && !loading && (
            <div className="t2v-error">
              <p>⚠️ {error}</p>
              <button className="t2v-retry-btn" onClick={handleGenerate}>Try Again</button>
            </div>
          )}
          {result && !loading && (
            <div className="t2v-video-wrap">
              <video src={result} controls autoPlay loop className="t2v-video" />
            </div>
          )}
        </div>
      )}

      {/* Pickers */}
      {showStylePicker && (
        <VideoStylePicker
          selectedStyle={selectedStyle}
          onSelect={setSelectedStyle}
          onClose={() => { setShowStylePicker(false); unlockScroll(); }}
        />
      )}
      {showCharPicker && (
        <CharacterPicker
          characters={characters}
          selectedCharacter={selectedCharacter}
          onSelect={onSelectCharacter}
          onClose={() => { setShowCharPicker(false); unlockScroll(); }}
          onCharacterCreated={onCharacterCreated}
        />
      )}
    </div>
  );
}
