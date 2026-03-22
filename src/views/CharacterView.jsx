import React, { useState, useEffect, useRef } from 'react';
import CreateCharacterModal, { BODY_TYPES, RACES } from '../components/Shared/CreateCharacterModal';
import { Plus, X, ChevronRight, ChevronLeft, Check, User } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext';
import './CharacterView.css';

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
