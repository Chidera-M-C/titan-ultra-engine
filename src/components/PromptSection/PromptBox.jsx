import React, { useRef, useEffect, useState } from 'react';
import { Send, ArrowDownLeft, UserPlus, X, Check, Sparkles } from 'lucide-react';
import AspectRatioDropdown from './AspectRatioDropdown';
import './PromptBox.css';
import CreateCharacterModal from '../Shared/CreateCharacterModal';

// ── Style picker mini modal ───────────────────────────────────────────────
const MOODS = [
  {
    id: 'female_nude_portrait',
    image: '/styles/female_nude_portrait.jpg',
    title: 'Female Nude Portrait',
    description: 'Elegant, artistic, fully exposed',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, beautiful nude woman, solo female, elegant artistic pose, completely naked, bare skin, detailed anatomy, perky breasts, erect nipples, soft natural lighting, studio portrait, shallow depth of field, cinematic composition, flawless skin texture, sensual expression, high fashion editorial, intimate atmosphere',
    gradient: 'linear-gradient(160deg, #1a0a1a, #3d1a2e, #7b2d52)',
  },
  {
    id: 'missionary_style',
    image: '/styles/missionary_style.jpg',
    title: 'Missionary Style',
    description: 'Intimate, deep, eye contact',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, passionate missionary sex, 1girl 1boy, legs spread wide, deep penetration, mating press, eye contact, intense expression, completely naked, detailed pussy penetration, erect cock inside vagina, sweaty bodies, skin contact, soft bedroom lighting, cinematic close-up, intimate atmosphere, breeding position, high detail anatomy',
    gradient: 'linear-gradient(160deg, #1a0a0a, #3d1010, #7b2020)',
  },
  {
    id: 'doggy_style',
    image: '/styles/doggy_style.jpg',
    title: 'Doggy Style',
    description: 'From behind, arched, intense',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, passionate doggy style sex, 1girl 1boy, on all fours, ass up face down, deep penetration from behind, arched back, detailed pussy penetration, thick cock in vagina, ass spread, sweaty skin, intense expression, bedroom setting, low angle shot, cinematic lighting, high detail anatomy, raw passion',
    gradient: 'linear-gradient(160deg, #0a1a0a, #1a3d1a, #2d6e2d)',
  },
  {
    id: 'dressed_vs_naked',
    image: '/styles/dressed_vs_naked.jpg',
    title: 'Dressed vs Naked',
    description: 'Contrast, tease, reveal',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, dressed vs naked contrast, beautiful woman partially clothed, tight dress lifted, exposed breasts and pussy, detailed skin texture, seductive pose, soft bedroom lighting, cinematic composition, teasing expression, high fashion tease, intimate atmosphere, detailed fabric texture vs bare skin',
    gradient: 'linear-gradient(160deg, #1a1400, #3d3000, #8a6d00)',
  },
  {
    id: 'cowgirl_style',
    image: '/styles/cowgirl_style.jpg',
    title: 'Cowgirl Style',
    description: 'Dominant female, riding, control',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, passionate cowgirl sex, 1girl 1boy, woman on top riding cock, straddling position, breasts bouncing, hands on chest, detailed penetration, wet pussy on erect cock, dominant expression, bedroom setting, low angle shot, cinematic lighting, high detail anatomy, intense riding',
    gradient: 'linear-gradient(160deg, #1a0a2a, #3d1a4a, #7b2d7b)',
  },
  {
    id: 'anal_sex',
    image: '/styles/anal_sex.jpg',
    title: 'Anal Sex',
    description: 'Intense, deep anal penetration',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, intense anal sex, 1girl 1boy, anal penetration, thick cock deep in ass, gaping anus, ass spread wide, detailed anal anatomy, sweaty bodies, pained/pleasure expression, doggy or missionary anal pose, low angle shot, cinematic lighting, high detail skin texture, raw hardcore',
    gradient: 'linear-gradient(160deg, #0a0a1a, #1a1a3d, #2d1b5e)',
  },
  {
    id: 'oral_sex',
    image: '/styles/oral_sex.jpg',
    title: 'Oral Sex',
    description: 'Oral pleasure, deepthroat, licking',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, passionate oral sex, 1girl 1boy, deepthroat blowjob, cock in mouth, throat bulge, sloppy saliva, tongue on shaft, detailed oral anatomy, kneeling pose, intense eye contact, bedroom setting, close-up shot, cinematic lighting, high detail',
    gradient: 'linear-gradient(160deg, #1a0a0a, #3d1010, #7b2020)',
  },
  {
    id: 'threesome_sex',
    image: '/styles/threesome_sex.jpg',
    title: 'Threesome',
    description: 'Multiple partners, intense group',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, passionate threesome sex, 1girl 2boys, double penetration, spitroast position, one cock in pussy one in mouth, detailed anatomy, sweaty bodies, intense expressions, bedroom setting, low angle shot, cinematic lighting, high detail group sex',
    gradient: 'linear-gradient(160deg, #1a0a1a, #3d1a3d, #7b2d7b)',
  },
  {
    id: 'lesbian_sex',
    image: '/styles/lesbian_sex.jpg',
    title: 'Lesbian Sex',
    description: 'Passionate, intimate female-on-female',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, passionate lesbian sex, 2girls, intimate female-on-female, scissoring, tribbing, 69 position, strap-on penetration, detailed pussy-on-pussy contact, wet clits rubbing, aroused expressions, heavy breathing, kissing, nipple sucking, sweaty bodies, soft bedroom lighting, close-up intimate shot, sensual atmosphere, high detail anatomy, erotic lesbian passion',
    gradient: 'linear-gradient(160deg, #1a0a2a, #3d1a4a, #7b2d7b)',
  },
  {
    id: 'cum_on_face',
    image: '/styles/cum_on_face.jpg',
    title: 'Cum on Face',
    description: 'Facial, messy finish',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, intense cum on face, beautiful woman, thick cum on cheeks and lips, dripping semen, post-orgasm expression, detailed facial anatomy, close-up shot, soft lighting, high detail cum texture, erotic finish',
    gradient: 'linear-gradient(160deg, #1a0a0a, #3d1010, #7b2020)',
  },
];


// ── Style picker mini modal ───────────────────────────────────────────────
function StylePicker({ selectedStyle, onSelect, onClose }) {
  return (
    <div className="style-picker-overlay" onClick={onClose}>
      <div className="style-picker" onClick={e => e.stopPropagation()}>
        <div className="style-picker-header">
          <p className="style-picker-title">Select Style</p>
          <button className="char-picker-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="style-picker-grid">
          {MOODS.map(mood => (
            <button
              key={mood.id}
              className={`style-picker-item ${selectedStyle?.id === mood.id ? 'selected' : ''}`}
              onClick={() => { onSelect(mood); onClose(); }}
            >
              <div className="style-picker-swatch">
                <img 
                  src={mood.image} 
                  alt={mood.title} 
                  className="style-picker-image"
                />
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
  onCharacterCreated,
  selectedStyle,
  onSelectStyle,
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

                {/* ── Style selector ───────────────────────────────────── */}
                {selectedStyle ? (
                  <div
                    className="style-pill"
                    onClick={() => setShowStylePicker(true)}
                    title="Change style"
                  >
                    <div className="style-pill-swatch" style={{ background: selectedStyle.gradient }} />
                    <span className="style-pill-name">{selectedStyle.title}</span>
                    <button
                      className="char-pill-remove"
                      onClick={e => { e.stopPropagation(); onSelectStyle(null); }}
                      title="Remove style"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="char-add-btn style-required"
                    onClick={() => setShowStylePicker(true)}
                    title="Select style (required)"
                  >
                    <Sparkles size={14} />
                    <span>Style *</span>
                  </button>
                )}
              </div>

              <button
                className="generate-fab"
                onClick={onGenerate}
                disabled={!canGenerate}
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
            if (onCharacterCreated) onCharacterCreated(newChar);
          }}
        />
      )}

      {/* ── Style picker modal ────────────────────────────────────────── */}
      {showStylePicker && (
        <StylePicker
          selectedStyle={selectedStyle}
          onSelect={onSelectStyle}
          onClose={() => setShowStylePicker(false)}
        />
      )}
    </div>
  );
}
