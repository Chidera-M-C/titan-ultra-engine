import React, { useRef, useEffect, useState } from 'react';
import { Send, ArrowDownLeft, UserPlus, X, Check } from 'lucide-react';
import AspectRatioDropdown from './AspectRatioDropdown';
import './PromptBox.css';
import CreateCharacterModal from '../Shared/CreateCharacterModal';

// ── Mini character picker modal ───────────────────────────────────────────
function CharacterPicker({ characters, selectedCharacter, onSelect, onClose, onCharacterCreated }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
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

            {/* New character button — always last */}
            <button className="char-picker-create" onClick={() => setShowCreate(true)}>
              <div className="char-picker-create-icon"><UserPlus size={20} /></div>
              <span className="char-picker-name">New</span>
            </button>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateCharacterModal
          onClose={() => setShowCreate(false)}
          onCreated={(newChar) => {
            if (onCharacterCreated) onCharacterCreated(newChar);
          }}
        />
      )}
    </>
  );
}

export default function PromptBox({
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  onGenerate,
  loading,
  collapsed = false,
  negativePrompt,
  setNegativePrompt,
  onOpenSidebar,
  selectedCharacter,
  onSelectCharacter,
  characters = [],
  onCharacterCreated,  // ← add this
}) {
  const textareaRef = useRef(null);
  const [showCharPicker, setShowCharPicker] = useState(false);

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

        {/* ── Main prompt box ─────────────────────────────────────────── */}
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
                  onGenerate();
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

                {/* ── Character selector ──────────────────────────────── */}
                {selectedCharacter ? (
                  <div className="char-pill">
                    <img src={selectedCharacter.photo_url} alt={selectedCharacter.name} className="char-pill-photo" />
                    <span className="char-pill-name">{selectedCharacter.name}</span>
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
                  <button
                    className="char-add-btn"
                    onClick={() => setShowCharPicker(true)}
                    title="Add character"
                  >
                    <UserPlus size={14} />
                    <span>Character</span>
                  </button>
                )}
              </div>

              <button
                className="generate-fab"
                onClick={onGenerate}
                disabled={!prompt.trim() || loading}
              >
                {loading ? <div className="spinner"></div> : <Send size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Negative prompt box ──────────────────────────────────────── */}
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

      {/* ── Character picker modal ────────────────────────────────────── */}
      {showCharPicker && (
        <CharacterPicker
          characters={characters}
          selectedCharacter={selectedCharacter}
          onSelect={onSelectCharacter}
          onClose={() => setShowCharPicker(false)}
          onCharacterCreated={(newChar) => {
            if (onSelectCharacter) onSelectCharacter(newChar);
            // Also bubble up to App.jsx to update userCharacters
            if (onCharacterCreated) onCharacterCreated(newChar);
          }}
        />
      )}
    </div>
  );
}
