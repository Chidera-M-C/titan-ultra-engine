import React, { useRef, useEffect, useState } from 'react';
import { Send, ArrowDownLeft, UserPlus, X, Check, Sparkles, Zap } from 'lucide-react';
import AspectRatioDropdown from './AspectRatioDropdown';
import './PromptBox.css';
import CreateCharacterModal from '../Shared/CreateCharacterModal';
import { IMAGE_STYLES } from '../../data/imageStyles';
import { createPortal } from 'react-dom';

// ── Style picker mini modal ───────────────────────────────────────────────
function StylePicker({ selectedStyle, onSelect, onClose }) {
  const [showCreate, setShowCreate] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  
  return createPortal(
    <div className="style-picker-overlay" onClick={onClose}>
      <div className="style-picker" onClick={e => e.stopPropagation()}>
        <div className="style-picker-header">
          <p className="style-picker-title">Select Style</p>
          <button className="char-picker-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="style-picker-grid">
          {IMAGE_STYLES.map(mood => (
            <button
              key={mood.id}
              className={`style-picker-item ${selectedStyle?.id === mood.id ? 'selected' : ''}`}
              onClick={() => { onSelect(mood); onClose(); }}
            >
              <div className="style-picker-swatch">
                {mood.image ? (
                  <img src={mood.image} alt={mood.title} className="style-picker-image" />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: mood.gradient }} />
                )}
                {selectedStyle?.id === mood.id && (
                  <div className="style-picker-check"><Check size={10} /></div>
                )}
              </div>
              <span className="style-picker-name">{mood.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mini character picker modal ───────────────────────────────────────────
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

export default function PromptBox({
  prompt, setPrompt, aspectRatio, setAspectRatio,
  onGenerate, loading, collapsed = false,
  negativePrompt, setNegativePrompt, onOpenSidebar,
  selectedCharacter, onSelectCharacter, characters = [], onCharacterCreated,
  selectedStyle, onSelectStyle,
}) {
  const textareaRef = useRef(null);
  const [showCharPicker, setShowCharPicker] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);

  const canGenerate = prompt.trim() && selectedStyle && !loading;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    resize();
    textarea.style.scrollbarWidth = 'thin';
    textarea.style.scrollbarColor = '#2A2A2A #161616';
    textarea.addEventListener('input', resize);
    window.addEventListener('resize', resize);
    return () => {
      textarea.removeEventListener('input', resize);
      window.removeEventListener('resize', resize);
    };
  }, [prompt, collapsed]);

  return (
    <div className={`prompt-container ${collapsed ? 'collapsed' : ''}`}>
      <div className="prompt-inputs-row">

        <div className="prompt-input-block prompt-input-main">
          <p className="prompt-negative-label prompt-spacer">Prompt</p>
          <div className="prompt-input-main-box">
            <textarea
              ref={textareaRef}
              className="prompt-input"
              placeholder={collapsed ? 'Describe what you want to create...' : 'Describe what you wanna see...'}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canGenerate) onGenerate();
                }
              }}
            />
            <div className="prompt-hint-row">
              <p className="prompt-hint mobile-sidebar-trigger" onClick={onOpenSidebar}>
                Plain words don't work! Promptimize it <ArrowDownLeft size={11} />
              </p>
            </div>
            <div className="prompt-footer">
              <div className="left-tools">
                <AspectRatioDropdown value={aspectRatio} onChange={setAspectRatio} />

                {/* Character */}
                {selectedCharacter ? (
                  <div className="char-pill">
                    <img src={selectedCharacter.photo_url} alt={selectedCharacter.name} className="char-pill-photo" />
                    <span className="char-pill-name btn-label">{selectedCharacter.name}</span>
                    {!selectedCharacter.face_embedding && <span className="char-pill-dot" title="Processing face..." />}
                    <button className="char-pill-remove" onClick={() => onSelectCharacter(null)}><X size={10} /></button>
                  </div>
                ) : (
                  <button className="char-add-btn" onClick={() => setShowCharPicker(true)}>
                    <UserPlus size={14} /><span className="btn-label">Character</span>
                  </button>
                )}

                {/* Style */}
                {selectedStyle ? (
                  <div 
                    className="style-pill" 
                    onClick={() => setShowStylePicker(true)}
                    title="Change style"
                  >
                    {/* Show real image - exactly like character photo */}
                    {selectedStyle.image ? (
                      <img 
                        src={selectedStyle.image} 
                        alt={selectedStyle.title} 
                        className="style-pill-img" 
                      />
                    ) : (
                      <div 
                        className="style-pill-swatch" 
                        style={{ background: selectedStyle.gradient }} 
                      />
                    )}
                    
                    <span className="style-pill-name btn-label">{selectedStyle.title}</span>
                    
                    <button 
                      className="char-pill-remove"
                      onClick={e => { 
                        e.stopPropagation(); 
                        onSelectStyle(null); 
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <button 
                    className="char-add-btn style-required" 
                    onClick={() => setShowStylePicker(true)}
                  >
                    <Sparkles size={14} />
                    <span className="btn-label">Style *</span>
                  </button>
                )}
              </div>

              <button className="generate-fab" onClick={onGenerate} disabled={!canGenerate}>
                {loading ? <div className="spinner"></div> : (
                  <>
                    <Send size={20} />
                    <span className="generate-cost">2<Zap size={10} fill="currentColor" /></span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="prompt-input-block prompt-input-negative">
          <p className="prompt-negative-label">Negative prompt</p>
          <div className="prompt-negative-box">
            <textarea
              className="prompt-negative-textarea"
              placeholder="What to avoid (e.g. blurry, bad hands, extra fingers, low quality...)"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
        </div>

      </div>

      {showCharPicker && (
        <CharacterPicker
          characters={characters} selectedCharacter={selectedCharacter}
          onSelect={onSelectCharacter} onClose={() => setShowCharPicker(false)}
          onCharacterCreated={(newChar) => { if (onSelectCharacter) onSelectCharacter(newChar); if (onCharacterCreated) onCharacterCreated(newChar); }}
        />
      )}

      {showStylePicker && (
        <StylePicker selectedStyle={selectedStyle} onSelect={onSelectStyle} onClose={() => setShowStylePicker(false)} />
      )}
    </div>
  );
}
