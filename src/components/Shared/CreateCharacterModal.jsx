import React, { useState, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Check, User } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext';

import { BodyType01, BodyType02, BodyType03, BodyType04, BodyType05, BodyType06,
         BodyType07, BodyType08, BodyType09, BodyType10, BodyType11, BodyType12 }
  from '../../views/CharacterBodySVGs';

export const BODY_TYPES = [
  { id: 'slim_flat',    label: 'Slim & Flat',         prompt: 'slim petite figure, flat chest, lean body',                                              Icon: BodyType01 },
  { id: 'slim_busty',   label: 'Slim & Busty',         prompt: 'slim figure, large breasts, narrow waist, lean legs',                                    Icon: BodyType03 },
  { id: 'athletic',     label: 'Athletic',              prompt: 'athletic toned figure, muscular definition, fit body, medium chest',                     Icon: BodyType05 },
  { id: 'hourglass',    label: 'Hourglass',             prompt: 'hourglass figure, full breasts, narrow waist, wide hips, curvy',                         Icon: BodyType07 },
  { id: 'pear',         label: 'Pear Shape',            prompt: 'pear shaped figure, small chest, wide hips, thick thighs, curvy bottom',                 Icon: BodyType09 },
  { id: 'curvy_plus',   label: 'Curvy Plus',            prompt: 'full figured plus size, large breasts, curvy waist, wide hips, thick thighs',            Icon: BodyType11 },
  { id: 'apple',        label: 'Apple Shape',           prompt: 'apple shaped figure, fuller midsection, medium chest, slimmer legs',                     Icon: BodyType02 },
  { id: 'petite_curvy', label: 'Petite Curvy',          prompt: 'petite curvy figure, small frame, proportional curves, medium chest, round hips',        Icon: BodyType04 },
  { id: 'tall_slim',    label: 'Tall & Slim',           prompt: 'tall slim figure, long legs, lean body, small chest, model figure',                      Icon: BodyType06 },
  { id: 'muscular_fem', label: 'Muscular Feminine',     prompt: 'muscular feminine figure, defined muscles, athletic curves, strong build, toned',         Icon: BodyType08 },
  { id: 'bbw',          label: 'BBW',                   prompt: 'BBW figure, very large breasts, very curvy, plus size, thick everywhere, full body',      Icon: BodyType10 },
  { id: 'rectangle',   label: 'Rectangle',             prompt: 'rectangle straight figure, equal shoulders and hips, athletic build, minimal curves',     Icon: BodyType12 },
];

export const RACES = [
  { id: 'african',  label: 'African',  emoji: '🌍' },
  { id: 'american', label: 'American', emoji: '🇺🇸' },
  { id: 'asian',    label: 'Asian',    emoji: '🌏' },
  { id: 'latina',   label: 'Latina',   emoji: '💃' },
  { id: 'hispanic', label: 'Hispanic', emoji: '🌺' },
  { id: 'arabic',   label: 'Arabic',   emoji: '🌙' },
  { id: 'european', label: 'European', emoji: '🌹' },
  { id: 'indian',   label: 'Indian',   emoji: '🪷' },
  { id: 'mixed',    label: 'Mixed',    emoji: '✨' },
];

export default function CreateCharacterModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [step, setStep]         = useState(1);
  const [name, setName]         = useState('');
  const [photo, setPhoto]       = useState(null);
  const [bodyType, setBodyType] = useState(null);
  const [race, setRace]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const fileInputRef            = useRef(null);

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
      const base64Data    = photo.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteArray     = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
      const blob     = new Blob([byteArray], { type: 'image/jpeg' });
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
          user_id:        user.id,
          name:           name.trim(),
          race,
          body_type:      bodyType,
          photo_url:      publicUrl,
          face_embedding: null,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // Notify parent immediately with null embedding
      onCreated(data);

      // ── 3. Extract face embedding ────────────────────────────────────
      try {
        const extractRes  = await fetch('/api/extract-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: data.id, image: photo })
        });
        const extractData = await extractRes.json();

        if (extractData.success) {
          const { data: updated } = await supabase
            .from('characters').select('*').eq('id', data.id).single();
          if (updated) onCreated(updated); // call again with embedding populated
        }
      } catch (err) {
        console.error('Face extraction failed:', err);
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

        <div className="char-modal-header">
          <h2 className="char-modal-title">
            {step === 1 && 'Create Character'}
            {step === 2 && 'Select Body Type'}
            {step === 3 && 'Select Race'}
          </h2>
          <button className="char-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="char-steps">
          {[1,2,3].map(s => (
            <div key={s} className={`char-step ${step === s ? 'active' : ''} ${step > s ? 'done' : ''}`}>
              {step > s ? <Check size={12} /> : s}
            </div>
          ))}
        </div>

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
