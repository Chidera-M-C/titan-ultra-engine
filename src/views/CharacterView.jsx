import React, { useState, useEffect, useRef } from 'react';
import CreateCharacterModal, { BODY_TYPES, RACES } from '../components/Shared/CreateCharacterModal';
import { Plus, X, ChevronRight, ChevronLeft, Check, User } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext';
import './CharacterView.css';

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
      // ── 1. Upload photo ─────────────────────────────────────────────
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
  
      // ── 2. Insert character record ───────────────────────────────────
      const { data, error: insertError } = await supabase
        .from('characters')
        .insert({
          user_id: user.id,
          name: name.trim(),
          race,
          body_type: bodyType,
          photo_url: publicUrl,
          face_embedding: null,
        })
        .select()
        .single();
      if (insertError) throw insertError;
  
      // Add to local list immediately with null embedding
      onCreated(data);
  
      // ── 3. Extract face embedding ────────────────────────────────────
      try {
        const extractRes = await fetch('/api/extract-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: data.id, image: photo })
        });
        const extractData = await extractRes.json();
  
        if (extractData.success) {
          // Refetch updated character with embedding
          const { data: updated } = await supabase
            .from('characters')
            .select('*')
            .eq('id', data.id)
            .single();
          if (updated) {
            setCharacters(prev => prev.map(c => c.id === data.id ? updated : c));
            if (onCharacterCreated) onCharacterCreated(updated);
          }
        } else {
          if (onCharacterCreated) onCharacterCreated(data);
        }
      } catch (err) {
        console.error('Face extraction failed:', err);
        if (onCharacterCreated) onCharacterCreated(data);
      }
  
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
                  <bt.Icon />
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

  const handleSelect = async () => {
    const { data } = await supabase
      .from('characters')
      .select('*')
      .eq('id', character.id)
      .single();
    onSelect(data || character);
  };

  return (
    <div
      className={`char-card ${isSelected ? 'selected' : ''}`}
      onClick={handleSelect}
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
export default function CharacterView({ onSelectCharacter, selectedCharacter, onCharacterCreated }) {
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
    if (onCharacterCreated) onCharacterCreated(newChar);
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
