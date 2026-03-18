import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, ChevronRight, ChevronLeft, Check, User } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext';
import './CharacterView.css';

// ── Body type silhouettes ─────────────────────────────────────────────────
const BODY_TYPES = [
  { id: 'slim_flat',       label: 'Slim & Flat',         prompt: 'slim petite figure, flat chest, lean body',                      viewBox: '0 0 60 120', path: 'M30 8 C26 8 23 11 23 15 C23 19 26 22 30 22 C34 22 37 19 37 15 C37 11 34 8 30 8Z M26 23 C22 24 20 27 20 32 L20 55 C20 57 21 59 23 59 L24 80 C24 83 26 85 28 85 L32 85 C34 85 36 83 36 80 L37 59 C39 59 40 57 40 55 L40 32 C40 27 38 24 34 23Z M24 85 L22 112 L28 112 L30 95 L32 112 L38 112 L36 85Z' },
  { id: 'slim_busty',      label: 'Slim & Busty',         prompt: 'slim figure, large breasts, narrow waist, lean legs',            viewBox: '0 0 60 120', path: 'M30 8 C26 8 23 11 23 15 C23 19 26 22 30 22 C34 22 37 19 37 15 C37 11 34 8 30 8Z M24 23 C19 25 17 29 17 34 C17 39 20 44 25 46 L24 55 C24 57 25 59 27 59 L28 80 C28 83 29 85 30 85 C31 85 32 83 32 80 L33 59 C35 59 36 57 36 55 L35 46 C40 44 43 39 43 34 C43 29 41 25 36 23Z M28 85 L26 112 L30 112 L30 95 L30 112 L34 112 L32 85Z' },
  { id: 'athletic',        label: 'Athletic',              prompt: 'athletic toned figure, muscular definition, fit body, medium chest', viewBox: '0 0 60 120', path: 'M30 8 C26 8 23 11 23 15 C23 19 26 22 30 22 C34 22 37 19 37 15 C37 11 34 8 30 8Z M25 23 C21 24 19 28 19 33 L18 46 C18 49 20 51 22 52 L23 55 C22 57 22 59 24 60 L25 80 C25 83 27 85 29 85 L31 85 C33 85 35 83 35 80 L36 60 C38 59 38 57 37 55 L38 52 C40 51 42 49 42 46 L41 33 C41 28 39 24 35 23Z M25 85 L23 112 L29 112 L30 95 L31 112 L37 112 L35 85Z' },
  { id: 'hourglass',       label: 'Hourglass',             prompt: 'hourglass figure, full breasts, narrow waist, wide hips, curvy',  viewBox: '0 0 60 120', path: 'M30 8 C26 8 23 11 23 15 C23 19 26 22 30 22 C34 22 37 19 37 15 C37 11 34 8 30 8Z M22 23 C17 26 15 31 16 37 C17 42 21 47 27 49 L25 55 C24 58 25 60 27 61 L28 80 C28 83 29 85 30 85 C31 85 32 83 32 80 L33 61 C35 60 36 58 35 55 L33 49 C39 47 43 42 44 37 C45 31 43 26 38 23Z M28 85 C24 86 20 90 19 95 L17 112 L24 112 L27 98 L30 95 L33 98 L36 112 L43 112 L41 95 C40 90 36 86 32 85Z' },
  { id: 'pear',            label: 'Pear Shape',            prompt: 'pear shaped figure, small chest, wide hips, thick thighs, curvy bottom', viewBox: '0 0 60 120', path: 'M30 8 C26 8 23 11 23 15 C23 19 26 22 30 22 C34 22 37 19 37 15 C37 11 34 8 30 8Z M26 23 C22 24 21 27 21 31 L20 42 C20 44 21 46 23 47 L24 55 C23 57 23 59 25 60 L27 80 C27 83 28 85 30 85 C32 85 33 83 33 80 L35 60 C37 59 37 57 36 55 L37 47 C39 46 40 44 40 42 L39 31 C39 27 38 24 34 23Z M30 85 C24 86 19 91 17 97 L15 112 L23 112 L26 99 L30 96 L34 99 L37 112 L45 112 L43 97 C41 91 36 86 30 85Z' },
  { id: 'curvy_plus',      label: 'Curvy Plus',            prompt: 'full figured plus size, large breasts, curvy waist, wide hips, thick thighs', viewBox: '0 0 60 120', path: 'M30 8 C25 8 22 11 22 15 C22 19 25 22 30 22 C35 22 38 19 38 15 C38 11 35 8 30 8Z M20 23 C15 26 13 32 14 38 C15 44 20 50 27 52 L25 58 C24 61 25 63 27 64 L28 82 C28 85 29 87 30 87 C31 87 32 85 32 82 L33 64 C35 63 36 61 35 58 L33 52 C40 50 45 44 46 38 C47 32 45 26 40 23Z M28 87 C22 88 17 94 16 101 L14 115 L22 115 L26 102 L30 98 L34 102 L38 115 L46 115 L44 101 C43 94 38 88 32 87Z' },
  { id: 'apple',           label: 'Apple Shape',           prompt: 'apple shaped figure, fuller midsection, medium chest, slimmer legs', viewBox: '0 0 60 120', path: 'M30 8 C26 8 23 11 23 15 C23 19 26 22 30 22 C34 22 37 19 37 15 C37 11 34 8 30 8Z M22 23 C17 26 15 32 15 38 C15 46 18 54 25 57 L24 62 C23 64 24 66 26 67 L27 82 C27 85 28 87 30 87 C32 87 33 85 33 82 L34 67 C36 66 37 64 36 62 L35 57 C42 54 45 46 45 38 C45 32 43 26 38 23Z M27 87 L25 112 L29 112 L30 96 L31 112 L35 112 L33 87Z' },
  { id: 'petite_curvy',    label: 'Petite Curvy',          prompt: 'petite curvy figure, small frame, proportional curves, medium chest, round hips', viewBox: '0 0 60 120', path: 'M30 10 C27 10 24 13 24 16 C24 19 27 22 30 22 C33 22 36 19 36 16 C36 13 33 10 30 10Z M24 23 C20 25 18 29 18 34 C18 39 21 44 26 46 L25 54 C24 56 25 58 27 59 L28 77 C28 80 29 82 30 82 C31 82 32 80 32 77 L33 59 C35 58 36 56 35 54 L34 46 C39 44 42 39 42 34 C42 29 40 25 36 23Z M28 82 C24 83 21 87 20 92 L18 110 L25 110 L28 95 L30 92 L32 95 L35 110 L42 110 L40 92 C39 87 36 83 32 82Z' },
  { id: 'tall_slim',       label: 'Tall & Slim',           prompt: 'tall slim figure, long legs, lean body, small chest, model figure', viewBox: '0 0 60 120', path: 'M30 6 C27 6 24 9 24 13 C24 17 27 20 30 20 C33 20 36 17 36 13 C36 9 33 6 30 6Z M26 21 C22 22 21 25 21 29 L21 50 C21 52 22 54 24 55 L25 75 C25 78 27 80 29 80 L31 80 C33 80 35 78 35 75 L36 55 C38 54 39 52 39 50 L39 29 C39 25 38 22 34 21Z M25 80 L23 114 L28 114 L30 96 L32 114 L37 114 L35 80Z' },
  { id: 'muscular_fem',    label: 'Muscular Feminine',     prompt: 'muscular feminine figure, defined muscles, athletic curves, strong build, toned', viewBox: '0 0 60 120', path: 'M30 8 C26 8 23 11 23 15 C23 19 26 22 30 22 C34 22 37 19 37 15 C37 11 34 8 30 8Z M24 23 C19 25 17 30 17 35 L17 48 C17 51 19 54 22 55 L23 58 C22 60 22 62 24 63 L25 80 C25 83 27 85 29 85 L31 85 C33 85 35 83 35 80 L36 63 C38 62 38 60 37 58 L38 55 C41 54 43 51 43 48 L43 35 C43 30 41 25 36 23Z M25 85 L23 112 L28 112 L30 95 L32 112 L37 112 L35 85Z' },
  { id: 'bbw',             label: 'BBW',                   prompt: 'BBW figure, very large breasts, very curvy, plus size, thick everywhere, full body', viewBox: '0 0 60 120', path: 'M30 7 C24 7 20 11 20 16 C20 21 24 24 30 24 C36 24 40 21 40 16 C40 11 36 7 30 7Z M17 25 C11 29 9 36 10 43 C11 50 17 57 25 59 L23 65 C21 68 22 71 25 72 L26 88 C26 92 28 94 30 94 C32 94 34 92 34 88 L35 72 C38 71 39 68 37 65 L35 59 C43 57 49 50 50 43 C51 36 49 29 43 25Z M26 94 C19 96 14 103 13 110 L11 118 L20 118 L24 107 L30 103 L36 107 L40 118 L49 118 L47 110 C46 103 41 96 34 94Z' },
  { id: 'rectangle',      label: 'Rectangle',             prompt: 'rectangle straight figure, equal shoulders and hips, athletic build, minimal curves', viewBox: '0 0 60 120', path: 'M30 8 C26 8 23 11 23 15 C23 19 26 22 30 22 C34 22 37 19 37 15 C37 11 34 8 30 8Z M24 23 C20 24 19 27 19 31 L19 56 C19 58 21 60 23 60 L24 80 C24 83 26 85 28 85 L32 85 C34 85 36 83 36 80 L37 60 C39 60 41 58 41 56 L41 31 C41 27 40 24 36 23Z M24 85 L22 112 L28 112 L30 95 L32 112 L38 112 L36 85Z' },
];

const RACES = [
  { id: 'african',    label: 'African',    emoji: '🌍' },
  { id: 'american',   label: 'American',   emoji: '🇺🇸' },
  { id: 'asian',      label: 'Asian',      emoji: '🌏' },
  { id: 'latina',     label: 'Latina',     emoji: '💃' },
  { id: 'hispanic',   label: 'Hispanic',   emoji: '🌺' },
  { id: 'arabic',     label: 'Arabic',     emoji: '🌙' },
  { id: 'european',   label: 'European',   emoji: '🌹' },
  { id: 'indian',     label: 'Indian',     emoji: '🪷' },
  { id: 'mixed',      label: 'Mixed',      emoji: '✨' },
];

// ── Create Character Modal ────────────────────────────────────────────────
function CreateCharacterModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1=name+photo, 2=body, 3=race
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null);
  const [bodyType, setBodyType] = useState(null);
  const [race, setRace] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreate = async () => {
    if (!name.trim() || !photo || !bodyType || !race) return;
    setSaving(true);
    setError('');
    try {
      // Upload photo to Supabase storage
      const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('character_photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('character_photos')
        .getPublicUrl(fileName);

      // Insert character record
      const bodyTypeData = BODY_TYPES.find(b => b.id === bodyType);
      const raceData = RACES.find(r => r.id === race);

      const { data, error: insertError } = await supabase
        .from('characters')
        .insert({
          user_id: user.id,
          name: name.trim(),
          race: race,
          body_type: bodyType,
          photo_url: publicUrl,
          face_embedding: null, // will be populated by handler later
        })
        .select()
        .single();

      if (insertError) throw insertError;

      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="char-modal-overlay" onClick={onClose}>
      <div className="char-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="char-modal-header">
          <h2 className="char-modal-title">
            {step === 1 && 'Create Character'}
            {step === 2 && 'Select Body Type'}
            {step === 3 && 'Select Race'}
          </h2>
          <button className="char-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Step indicators */}
        <div className="char-steps">
          {[1,2,3].map(s => (
            <div key={s} className={`char-step ${step === s ? 'active' : ''} ${step > s ? 'done' : ''}`}>
              {step > s ? <Check size={12} /> : s}
            </div>
          ))}
        </div>

        {/* Step 1 — Name + Photo */}
        {step === 1 && (
          <div className="char-step-content">
            <div className="char-field">
              <label className="char-label">Character Name</label>
              <input
                className="char-input"
                placeholder="e.g. Sofia, Luna, Aria..."
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={30}
              />
            </div>

            <div className="char-field">
              <label className="char-label">Upload Photo</label>
              <p className="char-sublabel">Face must be clearly visible. Full body works too.</p>
              {!photo ? (
                <div className="char-upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <User size={32} color="#555" />
                  <p>Click to upload photo</p>
                  <span>JPG, PNG up to 10MB</span>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                </div>
              ) : (
                <div className="char-photo-preview">
                  <img src={photo} alt="Character" />
                  <button className="char-photo-remove" onClick={() => setPhoto(null)}><X size={14} /></button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Body Type */}
        {step === 2 && (
          <div className="char-step-content">
            <div className="char-body-grid">
              {BODY_TYPES.map(bt => (
                <button
                  key={bt.id}
                  className={`char-body-card ${bodyType === bt.id ? 'selected' : ''}`}
                  onClick={() => setBodyType(bt.id)}
                >
                  <svg viewBox={bt.viewBox} className="char-body-svg">
                    <path d={bt.path} fill="currentColor" />
                  </svg>
                  <span>{bt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Race */}
        {step === 3 && (
          <div className="char-step-content">
            <div className="char-race-grid">
              {RACES.map(r => (
                <button
                  key={r.id}
                  className={`char-race-card ${race === r.id ? 'selected' : ''}`}
                  onClick={() => setRace(r.id)}
                >
                  <span className="char-race-emoji">{r.emoji}</span>
                  <span className="char-race-label">{r.label}</span>
                </button>
              ))}
            </div>
            {error && <p className="char-error">{error}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="char-modal-footer">
          {step > 1 && (
            <button className="char-btn-back" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step < 3 ? (
            <button
              className="char-btn-next"
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 1 && (!name.trim() || !photo)) ||
                (step === 2 && !bodyType)
              }
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              className="char-btn-create"
              onClick={handleCreate}
              disabled={!race || saving}
            >
              {saving ? 'Creating...' : 'Create Character'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Character Card ────────────────────────────────────────────────────────
function CharacterCard({ character, isSelected, onSelect }) {
  const bodyTypeData = BODY_TYPES.find(b => b.id === character.body_type);
  const raceData = RACES.find(r => r.id === character.race);

  return (
    <div
      className={`char-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(character)}
    >
      <div className="char-card-photo">
        {character.photo_url ? (
          <img src={character.photo_url} alt={character.name} />
        ) : (
          <div className="char-card-placeholder"><User size={24} /></div>
        )}
        {isSelected && <div className="char-card-check"><Check size={12} /></div>}
      </div>
      <div className="char-card-info">
        <p className="char-card-name">{character.name}</p>
        <p className="char-card-meta">{raceData?.label} · {bodyTypeData?.label}</p>
      </div>
    </div>
  );
}

// ── Main CharacterView ────────────────────────────────────────────────────
export default function CharacterView({ onSelectCharacter, selectedCharacter }) {
  const { user } = useAuth();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadCharacters = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCharacters(data || []);
    } catch (err) {
      console.error('Failed to load characters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCharacters();
  }, [user]);

  const handleCreated = (newChar) => {
    setCharacters(prev => [newChar, ...prev]);
  };

  return (
    <div className="char-view">
      {/* Header */}
      <div className="char-view-header">
        <div>
          <h2 className="char-view-title">Characters</h2>
          <p className="char-view-subtitle">Create characters with consistent identity across all generations</p>
        </div>
        <button className="char-create-btn" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Character
        </button>
      </div>

      {/* Empty state */}
      {!loading && characters.length === 0 && (
        <div className="char-empty">
          <div className="char-empty-photos">
            <div className="char-empty-photo" />
            <div className="char-empty-photo char-empty-photo--mid" />
            <div className="char-empty-photo" />
          </div>
          <h3>Bring your character to life with just one photo</h3>
          <p>Characters can then be added and referenced in any prompt.</p>
          <button className="char-create-btn-lg" onClick={() => setShowModal(true)}>
            Create character
          </button>
        </div>
      )}

      {/* Character grid */}
      {characters.length > 0 && (
        <div className="char-grid">
          {characters.map(char => (
            <CharacterCard
              key={char.id}
              character={char}
              isSelected={selectedCharacter?.id === char.id}
              onSelect={onSelectCharacter}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateCharacterModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
