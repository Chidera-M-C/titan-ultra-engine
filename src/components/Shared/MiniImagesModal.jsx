// src/components/Shared/MiniImagesModal.jsx
import React, { useState, useMemo } from 'react';
import { X, ArrowLeft, Sparkles, Heart, User, Pencil, Shuffle } from 'lucide-react';
import './MiniImagesModal.css';

const CATEGORIES = [
  {
    key: 'generated',
    label: 'Generated',
    icon: Sparkles,
    accent: '#7c3aed',
    filter: (img) => !img.category || img.category === '' || (img.category !== 'edit' && img.category !== 'character' && img.category !== 'faceswap'),
  },
  {
    key: 'liked',
    label: 'Liked',
    icon: Heart,
    accent: '#e11d48',
    filter: null, // handled separately
  },
  {
    key: 'character',
    label: 'Character',
    icon: User,
    accent: '#0ea5e9',
    filter: (img) => img.category === 'character',
  },
  {
    key: 'edited',
    label: 'Edited',
    icon: Pencil,
    accent: '#f59e0b',
    filter: (img) => img.category === 'edit',
  },
  {
    key: 'faceswap',
    label: 'Face Swap',
    icon: Shuffle,
    accent: '#10b981',
    filter: (img) => img.category === 'faceswap',
  },
];

const sortByDate = (arr) =>
  [...(arr || [])].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

export default function MiniImagesModal({ images, likedImages, onSelect, onClose, title = 'Select Image' }) {
  const [activeCategory, setActiveCategory] = useState(null);

  const allImages = images || [];

  const getImages = (cat) => {
    if (cat.key === 'liked') return sortByDate(likedImages || []);
    return sortByDate(allImages.filter(cat.filter));
  };

  return (
    <div className="mini-images-overlay" onClick={onClose}>
      <div className="mini-images-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="mini-images-header">
          {activeCategory ? (
            <button className="mini-images-back" onClick={() => setActiveCategory(null)}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <p className="mini-images-title">{title}</p>
          )}
          <button className="mini-images-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Content */}
        <div className="mini-images-body">
          {!activeCategory ? (
            // Category cards
            <div className="mini-images-cats">
              {CATEGORIES.map((cat) => {
                const catImages = getImages(cat);
                const cover = catImages[0];
                return (
                  <div
                    key={cat.key}
                    className="mini-images-cat-card"
                    onClick={() => setActiveCategory(cat.key)}
                  >
                    <div className="mini-images-cat-cover">
                      {cover ? (
                        <img src={cover.url} alt={cat.label} />
                      ) : (
                        <div className="mini-images-cat-empty">
                          <cat.icon size={24} color={cat.accent} opacity={0.4} />
                        </div>
                      )}
                    </div>
                    <div className="mini-images-cat-info">
                      <cat.icon size={14} color={cat.accent} />
                      <span style={{ color: cat.accent }}>{cat.label}</span>
                      <span className="mini-images-cat-count">{catImages.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Image grid inside category
            <ImageGrid
              images={getImages(CATEGORIES.find(c => c.key === activeCategory))}
              onSelect={onSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ImageGrid({ images, onSelect }) {
  if (!images || images.length === 0) {
    return <div className="mini-images-empty">No images here yet</div>;
  }
  return (
    <div className="mini-images-grid">
      {images.map((img) => (
        <div
          key={img.id}
          className="mini-images-item"
          onClick={() => onSelect(img)}
        >
          <img src={img.url} alt="" loading="lazy" />
        </div>
      ))}
    </div>
  );
}
