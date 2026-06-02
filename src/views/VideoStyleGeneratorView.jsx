// src/views/VideoStyleGeneratorView.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Video, UserPlus, X, Check, ImagePlus, Zap } from 'lucide-react';
import AspectRatioDropdown from '../components/PromptSection/AspectRatioDropdown';
import VideoControls from '../components/Video/VideoControls';
import MiniImagesModal from '../components/Shared/MiniImagesModal';
import CreateCharacterModal from '../components/Shared/CreateCharacterModal';
import { supabase } from '../lib/supabase.js';
import './VideoStyleGeneratorView.css';
import '../components/PromptSection/PromptBox.css';
import { createPortal } from 'react-dom';

function CharacterPicker({ characters, selectedCharacter, onSelect, onClose, onCharacterCreated }) {
  const [showCreate, setShowCreate] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  
  const [showCreate, setShowCreate] = useState(false);
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
    </>
  );
}

export default function VideoStyleGeneratorView({
  style, onBack, onGenerate, loading, error, result,
  selectedCharacter, onSelectCharacter, characters, onCharacterCreated,
  userImages, likedImages,
}) {
  const [prompt, setPrompt]               = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio]     = useState('9:16');
  const [duration, setDuration]           = useState(4);
  const [motionStrength, setMotionStrength] = useState(0.7);
  const [startImage, setStartImage]       = useState(null);
  const [endImage, setEndImage]           = useState(null);
  const [galleryVideos, setGalleryVideos] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState(null);
  const [showCharPicker, setShowCharPicker] = useState(false);

  const lockScroll = () => {
    const el = document.querySelector('.scrollable-area');
    if (el) el.style.overflow = 'hidden';
  };
  const unlockScroll = () => {
    const el = document.querySelector('.scrollable-area');
    if (el) el.style.overflow = '';
  };

  const canGenerate = startImage && !loading;

  const loadGallery = async () => {
    setGalleryLoading(true);
    try {
      const { data } = await supabase
        .from('videos')
        .select('*')
        .eq('style', style.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setGalleryVideos(data || []);
    } catch (err) {
      console.error('Failed to load video gallery:', err);
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => { loadGallery(); }, [style.id]);

  const handleGenerate = () => {
    if (!canGenerate) return;
    const finalPrompt = prompt.trim()
      ? `${prompt}, ${style.prompt}`
      : style.prompt;

    onGenerate({
      type: 'image_to_video',
      prompt: finalPrompt,
      negativePrompt,
      aspectRatio,
      style: style.id,
      duration,
      motionStrength,
      startImage: startImage?.url,
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
    <div className="vsg-view">
      {/* Banner */}
      <div className="vsg-banner" style={{ background: style.gradient }}>
        <button className="vsg-back" onClick={onBack}>
          <ArrowLeft size={18} /><span>Styles</span>
        </button>
        <div className="vsg-mood-info">
          <span className="vsg-emoji">{style.emoji}</span>
          <h2 className="vsg-title">{style.title}</h2>
          <p className="vsg-desc">{style.description}</p>
        </div>
      </div>

      {/* Start / End image boxes */}
      <div className="vsg-image-boxes">
        <div className="vsg-image-box-wrap">
          <p className="vsg-box-label">Start <span className="vsg-required">*</span></p>
          <div
            className={`vsg-image-box ${startImage ? 'has-image' : ''}`}
            onClick={() => { setImagePickerTarget('start'); lockScroll(); }}
          >
            {startImage ? (
              <>
                <img src={startImage.url} alt="Start" className="vsg-box-img" />
                <button className="vsg-box-remove" onClick={e => { e.stopPropagation(); setStartImage(null); }}>
                  <X size={12} />
                </button>
              </>
            ) : (
              <div className="vsg-box-empty">
                <ImagePlus size={20} color="#555" />
                <span>Add image</span>
              </div>
            )}
          </div>
        </div>

        <div className="vsg-arrow">→</div>

        <div className="vsg-image-box-wrap">
          <p className="vsg-box-label">End <span className="vsg-optional">(optional)</span></p>
          <div
            className={`vsg-image-box ${endImage ? 'has-image' : ''}`}
            onClick={() => { setImagePickerTarget('end'); lockScroll(); }}
          >
            {endImage ? (
              <>
                <img src={endImage.url} alt="End" className="vsg-box-img" />
                <button className="vsg-box-remove" onClick={e => { e.stopPropagation(); setEndImage(null); }}>
                  <X size={12} />
                </button>
              </>
            ) : (
              <div className="vsg-box-empty">
                <ImagePlus size={20} color="#555" />
                <span>Optional</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="vsg-inputs-row">
        <div className="vsg-input-block vsg-input-main">
          <p className="vsg-label">Add details <span className="vsg-label-hint">(optional)</span></p>
          <div className="vsg-prompt-box">
            <textarea
              className="vsg-textarea"
              placeholder={`e.g. "slow pan, golden light" — the ${style.title} style will be applied automatically`}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={loading}
              rows={3}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
            />
            <div className="vsg-footer">
              <div className="vsg-footer-left">
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
              </div>
              <button
                className="vsg-generate-btn"
                onClick={handleGenerate}
                disabled={!canGenerate}
                style={{ background: style.gradient }}
              >
                {loading ? <div className="spinner" /> : <><Video size={16} /><span className="btn-label"> Generate</span><Zap size={12} fill="currentColor" />30</>}
              </button>
            </div>
          </div>
        </div>

        <div className="vsg-input-block vsg-input-negative">
          <p className="vsg-label">Negative prompt</p>
          <div className="vsg-prompt-box vsg-negative-box">
            <textarea
              className="vsg-textarea vsg-negative"
              placeholder="What to avoid..."
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
          <VideoControls
            duration={duration} setDuration={setDuration}
            motionStrength={motionStrength} setMotionStrength={setMotionStrength}
            disabled={loading}
          />
        </div>
      </div>

      {/* Result */}
      {(loading || result || error) && (
        <div className="vsg-result">
          {loading && (
            <div className="vsg-loading">
              <div className="vsg-spinner" />
              <p>Generating your video...</p>
            </div>
          )}
          {error && !loading && (
            <div className="vsg-error">
              <p>⚠️ {error}</p>
              <button className="vsg-retry-btn" onClick={handleGenerate}>Try Again</button>
            </div>
          )}
          {result && !loading && (
            <div className="vsg-video-wrap">
              <video src={result} controls autoPlay loop className="vsg-video" />
            </div>
          )}
        </div>
      )}

      {/* Gallery */}
      <div className="vsg-gallery">
        <h3 className="vsg-gallery-title">{style.title} Gallery</h3>
        {galleryVideos.length === 0 && !galleryLoading ? (
          <div className="vsg-gallery-empty">
            <p>No videos yet — be the first to generate in this style!</p>
          </div>
        ) : (
          <div className="vsg-gallery-grid">
            {galleryVideos.map(v => (
              <div key={v.id} className="vsg-gallery-item">
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt="" />
                ) : (
                  <video src={v.video_url} muted loop onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
                )}
              </div>
            ))}
          </div>
        )}
        {galleryLoading && <div className="vsg-gallery-loading">Loading...</div>}
      </div>

      {/* Modals */}
      {imagePickerTarget && (
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
        />
      )}
      {showCharPicker && (
        <CharacterPicker characters={characters} selectedCharacter={selectedCharacter}
          onSelect={onSelectCharacter} onClose={() => { setShowCharPicker(false); unlockScroll(); }} onCharacterCreated={onCharacterCreated} />
      )}
    </div>
  );
}
