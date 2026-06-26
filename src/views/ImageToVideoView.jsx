// src/views/ImageToVideoView.jsx
import React, { useRef, useEffect, useState } from 'react';
import { Video, UserPlus, X, Check, Clapperboard, ImagePlus, Zap } from 'lucide-react';
import AspectRatioDropdown from '../components/PromptSection/AspectRatioDropdown';
import VideoStylePicker from '../components/Video/VideoStylePicker';
import VideoControls from '../components/Video/VideoControls';
import MiniImagesModal from '../components/Shared/MiniImagesModal';
import CreateCharacterModal from '../components/Shared/CreateCharacterModal';
import './ImageToVideoView.css';
import '../components/PromptSection/PromptBox.css';
import { createPortal } from 'react-dom';

function CharacterPicker({ characters, selectedCharacter, onSelect, onClose, onCharacterCreated }) {
  const [showCreate, setShowCreate] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  
  return createPortal(
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
    </>,
    document.body
  );
}

export default function ImageToVideoView({
  onGenerate, loading, error, result,
  selectedCharacter, onSelectCharacter, characters, onCharacterCreated,
  userImages, likedImages,
}) {
  const [prompt, setPrompt]               = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio]     = useState('9:16');
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [duration, setDuration]           = useState(4);
  const [motionStrength, setMotionStrength] = useState(0.7);
  const [startImage, setStartImage]       = useState(null);
  const [endImage, setEndImage]           = useState(null);
  const [showStylePicker, setShowStylePicker]   = useState(false);
  const [showCharPicker, setShowCharPicker]     = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState(null); // 'start' | 'end'

  const lockScroll = () => {
    const el = document.querySelector('.scrollable-area');
    if (el) el.style.overflow = 'hidden';
  };
  const unlockScroll = () => {
    const el = document.querySelector('.scrollable-area');
    if (el) el.style.overflow = '';
  };

  const canGenerate = startImage && selectedStyle && !loading;

  const handleGenerate = () => {
    if (!canGenerate) return;
  
    onGenerate({
      type: 'image_to_video',
      prompt,
      negativePrompt,
      aspectRatio,
      style: selectedStyle.id,
      duration,
      motionStrength,
      startImage: startImage?.url,  // just send URL directly
      endImage: endImage?.url || null,
      character: selectedCharacter ? {
        name: selectedCharacter.name,
        race: selectedCharacter.race,
        body_type: selectedCharacter.body_type,
      } : null,
      face_embedding: selectedCharacter?.face_embedding || null,
    });
  };

  return (
    <div className="i2v-view">
      <div className="i2v-header">
        <h1 className="i2v-title">Image → Video</h1>
        <p className="i2v-subtitle">Transform your images into stunning videos</p>
      </div>

      {/* Start / End image boxes */}
      <div className="i2v-image-boxes">
        <div className="i2v-image-box-wrap">
          <p className="i2v-box-label">Start <span className="i2v-required">*</span></p>
          <div
            className={`i2v-image-box ${startImage ? 'has-image' : ''}`}
            onClick={() => { setImagePickerTarget('start'); lockScroll(); }}
          >
            {startImage ? (
              <>
                <img src={startImage.url} alt="Start" className="i2v-box-img" />
                <button className="i2v-box-remove" onClick={e => { e.stopPropagation(); setStartImage(null); }}>
                  <X size={12} />
                </button>
              </>
            ) : (
              <div className="i2v-box-empty">
                <ImagePlus size={22} color="#555" />
                <span>Add image</span>
              </div>
            )}
          </div>
        </div>

        <div className="i2v-arrow">→</div>

        <div className="i2v-image-box-wrap">
          <p className="i2v-box-label">End <span className="i2v-optional">(optional)</span></p>
          <div
            className={`i2v-image-box ${endImage ? 'has-image' : ''}`}
            onClick={() => { setImagePickerTarget('end'); lockScroll(); }}
          >
            {endImage ? (
              <>
                <img src={endImage.url} alt="End" className="i2v-box-img" />
                <button className="i2v-box-remove" onClick={e => { e.stopPropagation(); setEndImage(null); }}>
                  <X size={12} />
                </button>
              </>
            ) : (
              <div className="i2v-box-empty">
                <ImagePlus size={22} color="#555" />
                <span>Add image</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prompt inputs */}
      <div className="i2v-inputs-row">
        <div className="i2v-input-block i2v-input-main">
          <p className="i2v-label">Prompt <span className="i2v-label-hint">(optional)</span></p>
          <div className="i2v-prompt-box">
            <textarea
              className="i2v-textarea"
              placeholder="Describe how you want the video to move or change..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={loading}
              rows={3}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
            />
            <div className="i2v-footer">
              <div className="i2v-footer-left">
                <AspectRatioDropdown value={aspectRatio} onChange={setAspectRatio} />

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

                {selectedStyle ? (
                  <div className="vstyle-pill" onClick={() => { setShowStylePicker(true); lockScroll(); }}>
                    <span>{selectedStyle.emoji}</span>
                    <span className="vstyle-pill-name btn-label">{selectedStyle.title}</span>
                    <button className="char-pill-remove" onClick={e => { e.stopPropagation(); setSelectedStyle(null); }}><X size={10} /></button>
                  </div>
                ) : (
                  <button className="char-add-btn vstyle-required" onClick={() => { setShowStylePicker(true); lockScroll(); }}>
                    <Clapperboard size={14} /><span className="btn-label">Style *</span>
                  </button>
                )}
              </div>

              <button
                className="i2v-generate-btn"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                {loading ? <div className="spinner" /> : <><Video size={16} /><span className="btn-label"> Generate</span><Zap size={12} fill="currentColor" />30</>}
              </button>
            </div>
          </div>
        </div>

        <div className="i2v-input-block i2v-input-negative">
          <p className="i2v-label">Negative prompt</p>
          <div className="i2v-prompt-box i2v-negative-box">
            <textarea
              className="i2v-textarea i2v-negative"
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
        <div className="i2v-result">
          {loading && (
            <div className="i2v-loading">
              <div className="i2v-loading-spinner" />
              <p>Generating your video... this may take a minute</p>
            </div>
          )}
          {error && !loading && (
            <div className="i2v-error">
              <p>⚠️ {error}</p>
              <button className="i2v-retry-btn" onClick={handleGenerate}>Try Again</button>
            </div>
          )}
          {result && !loading && (
            <div className="i2v-video-wrap">
              <video src={result} controls autoPlay loop className="i2v-video" />
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showStylePicker && createPortal(
        <VideoStylePicker selectedStyle={selectedStyle} onSelect={setSelectedStyle} onClose={() => { setShowStylePicker(false); unlockScroll(); }} />,
        document.body
      )}
      {showCharPicker && (
        <CharacterPicker characters={characters} selectedCharacter={selectedCharacter}
          onSelect={onSelectCharacter} onClose={() => { setShowCharPicker(false); unlockScroll(); }} onCharacterCreated={onCharacterCreated} />
      )}
      {imagePickerTarget && createPortal(
        <MiniImagesModal
          images={userImages}
          likedImages={likedImages}
          title={imagePickerTarget === 'start' ? 'Select Start Image' : 'Select End Image'}
          onSelect={(img) => {
            if (imagePickerTarget === 'start') setStartImage(img);
            else setEndImage(img);
            setImagePickerTarget(null);
            unlockScroll();
          }}
          onClose={() => { setImagePickerTarget(null); unlockScroll(); }}
        />,
        document.body
      )}
    </div>
  );
}
