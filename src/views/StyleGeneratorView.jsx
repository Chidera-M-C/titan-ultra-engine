import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, UserPlus, X, Check, Zap } from 'lucide-react';
import '../components/PromptSection/PromptBox.css';
import { supabase } from '../lib/supabase.js';
import AspectRatioDropdown from '../components/PromptSection/AspectRatioDropdown';
import MasonryGrid from '../components/Gallery/MasonryGrid';
import CreateCharacterModal from '../components/Shared/CreateCharacterModal';
import './StyleGeneratorView.css';

// ── Mini character picker (same as in PromptBox) ──────────────────────────
function CharacterPicker({ characters, selectedCharacter, onSelect, onClose, onCharacterCreated }) {
  const [showCreate, setShowCreate] = useState(false);
    // Lock/unlock the scrollable area when modals open
    const lockScroll = () => {
      const el = document.querySelector('.scrollable-area');
      if (el) el.style.overflow = 'hidden';
    };
    const unlockScroll = () => {
      const el = document.querySelector('.scrollable-area');
      if (el) el.style.overflow = '';
    };

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
                <button
                  key={char.id}
                  className={`char-picker-item ${selectedCharacter?.id === char.id ? 'selected' : ''}`}
                  onClick={() => { onSelect(char); onClose(); }}
                >
                  <div className="char-picker-photo">
                    {char.photo_url
                      ? <img src={char.photo_url} alt={char.name} />
                      : <div className="char-picker-placeholder" />
                    }
                    {selectedCharacter?.id === char.id && (
                      <div className="char-picker-check"><Check size={10} /></div>
                    )}
                  </div>
                  <span className="char-picker-name">{char.name}</span>
                  {!char.face_embedding && (
                    <span className="char-picker-processing">Processing...</span>
                  )}
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
        <CreateCharacterModal
          onClose={() => setShowCreate(false)}
          onCreated={(newChar) => {
            if (onCharacterCreated) onCharacterCreated(newChar);
            setShowCreate(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

export default function StyleGeneratorView({
  mood, onBack, onGenerate, loading,
  onViewImage, onEditImage, onSelectPrompt, prompt,
  selectedCharacter, onSelectCharacter,
  characters = [], onCharacterCreated,
}) {
  const [customPrompt, setCustomPrompt]     = useState('');
  const [aspectRatio, setAspectRatio]       = useState('9:16');
  const [galleryImages, setGalleryImages]   = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [hasMore, setHasMore]               = useState(true);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showCharPicker, setShowCharPicker] = useState(false);

  const finalPrompt = customPrompt.trim()
    ? `${customPrompt}, ${mood.prompt}`
    : mood.prompt;

  const handleGenerate = () => {
    const characterContext = selectedCharacter
      ? `${selectedCharacter.name}, ${selectedCharacter.race} woman, ${selectedCharacter.body_type?.replace(/_/g, ' ')}, same face same person, `
      : '';
    onGenerate(characterContext + finalPrompt, aspectRatio, negativePrompt, null);
  };

  const loadGallery = async (isLoadMore = false) => {
    if (galleryLoading) return;
    setGalleryLoading(true);
    try {
      const limit  = 20;
      const offset = isLoadMore ? galleryImages.length : 0;
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('style', mood.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      const fetched = data.map(doc => ({ id: doc.id, url: doc.image_url, prompt: doc.prompt }));
      if (isLoadMore) {
        setGalleryImages(prev => [...prev, ...fetched]);
      } else {
        setGalleryImages(fetched);
      }
      setHasMore(fetched.length === limit);
    } catch (err) {
      console.error('Failed to fetch style gallery:', err);
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => { loadGallery(); }, [mood.id]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.querySelector('.scrollable-area');
      if (!scrollable) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !galleryLoading) {
        loadGallery(true);
      }
    };
    const scrollable = document.querySelector('.scrollable-area');
    if (scrollable) {
      scrollable.addEventListener('scroll', handleScroll);
      return () => scrollable.removeEventListener('scroll', handleScroll);
    }
  }, [galleryImages, hasMore, galleryLoading]);

  return (
    <div className="style-gen-view">

      {/* ── Header banner ─────────────────────────────────────────────── */}
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

      {/* ── Prompt + Negative side by side ────────────────────────────── */}
      <div className="style-gen-inputs-row">

        {/* Main prompt */}
        <div className="style-gen-input-block style-gen-input-main">
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
              <div className="style-gen-footer-left">
                <AspectRatioDropdown value={aspectRatio} onChange={setAspectRatio} />

                {/* ── Character selector ─────────────────────────────── */}
                {selectedCharacter ? (
                  <div className="char-pill">
                    <img src={selectedCharacter.photo_url} alt={selectedCharacter.name} className="char-pill-photo" />
                    <span className="char-pill-name btn-label">{selectedCharacter.name}</span>
                    {!selectedCharacter.face_embedding && (
                      <span className="char-pill-dot" title="Processing face..." />
                    )}
                    <button
                      className="char-pill-remove"
                      onClick={() => onSelectCharacter(null)}
                      title="Remove character"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <button className="char-add-btn" onClick={() => { setShowCharPicker(true); lockScroll(); }} title="Add character">
                    <UserPlus size={14} />
                    <span className="btn-label">Character</span>
                  </button>
                )}
              </div>

              <button
                className="style-gen-btn"
                onClick={handleGenerate}
                disabled={loading}
                style={{ background: mood.gradient }}
              >
                {loading ? <div className="spinner" /> : <><Send size={16} /><span className="btn-label"> Generate</span><Zap size={12} fill="currentColor" />2</>}
              </button>
            </div>
          </div>
        </div>

        {/* Negative prompt */}
        <div className="style-gen-input-block style-gen-input-negative">
          <p className="style-gen-label">Negative prompt</p>
          <div className="style-gen-prompt-box style-gen-negative-box">
            <textarea
              className="style-gen-textarea style-gen-negative"
              placeholder="What to avoid (e.g. blurry, bad hands, extra fingers, low quality...)"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
        </div>

      </div>

      {/* ── Style gallery ──────────────────────────────────────────────── */}
      <div className="style-gen-gallery">
        <h3 className="style-gen-gallery-title">{mood.title} Gallery</h3>
        {galleryImages.length === 0 && !galleryLoading ? (
          <div className="style-gen-gallery-empty">
            <p>No images yet — be the first to generate in this style!</p>
          </div>
        ) : (
          <MasonryGrid
            images={galleryImages}
            prompt={prompt}
            onImageClick={onViewImage}
            onSelectPrompt={onSelectPrompt}
            onEditImage={onEditImage}
          />
        )}
        {galleryLoading && (
          <div className="style-gen-gallery-loading">Loading...</div>
        )}
      </div>

      {/* ── Character picker modal ─────────────────────────────────────── */}
      {showCharPicker && (
        <CharacterPicker
          characters={characters}
          selectedCharacter={selectedCharacter}
          onSelect={onSelectCharacter}
          onClose={() => { setShowCharPicker(false); unlockScroll(); }}
          onCharacterCreated={(newChar) => {
            if (onCharacterCreated) onCharacterCreated(newChar);
            if (onSelectCharacter) onSelectCharacter(newChar);
            setShowCharPicker(false);
            unlockScroll(); // add this
          }}
        />
      )}

    </div>
  );
}
