// src/components/Shared/MiniImagesModal.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ArrowLeft, Sparkles, Heart, User, Pencil, Shuffle, Upload, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext';
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
    filter: null,
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
  {
    key: 'added',
    label: 'Added Images',
    icon: Upload,
    accent: '#6366f1',
    filter: null, // handled separately
  },
];

const sortByDate = (arr) =>
  [...(arr || [])].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

export default function MiniImagesModal({ images, likedImages, onSelect, onClose, title = 'Select Image' }) {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState(null);
  const [addedImages, setAddedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Load user-uploaded images
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_images')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAddedImages((data || []).map(img => ({ ...img, url: img.image_url })));
      });
  }, [user]);

  const handleUpload = async (files) => {
    if (!user || !files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) continue;
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(path, file, { upsert: false });
        if (uploadError) continue;

        const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(path);
        const { data: dbRow, error: dbError } = await supabase
          .from('user_images')
          .insert({ user_id: user.id, image_url: urlData.publicUrl, name: file.name })
          .select()
          .single();

        if (!dbError && dbRow) {
          setAddedImages(prev => [{ ...dbRow, url: dbRow.image_url }, ...prev]);
        }
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e, img) => {
    e.stopPropagation();
    if (!user) return;
    await supabase.from('user_images').delete().eq('id', img.id);
    setAddedImages(prev => prev.filter(i => i.id !== img.id));
  };

  const allImages = images || [];

  const getImages = (cat) => {
    if (cat.key === 'liked') return sortByDate(likedImages || []);
    if (cat.key === 'added') return sortByDate(addedImages);
    return sortByDate(allImages.filter(cat.filter));
  };

  const activeCat = activeCategory ? CATEGORIES.find(c => c.key === activeCategory) : null;

  return (
    <div className="mini-images-overlay" onClick={onClose}>
      <div className="mini-images-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="mini-images-header">
          {activeCategory ? (
            <button className="mini-images-back" onClick={() => setActiveCategory(null)}>
              <ArrowLeft size={16} /><span>Back</span>
            </button>
          ) : (
            <p className="mini-images-title">{title}</p>
          )}

          {/* Upload button when in Added Images category */}
          {activeCategory === 'added' && (
            <>
              <button
                className="mini-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <div className="mini-upload-spinner" /> : <Plus size={13} />}
                <span>{uploading ? 'Uploading...' : 'Upload'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => handleUpload(Array.from(e.target.files))}
              />
            </>
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
          ) : activeCategory === 'added' ? (
            // Added images with upload + delete
            <AddedImagesGrid
              images={addedImages}
              onSelect={onSelect}
              onDelete={handleDelete}
              onUpload={handleUpload}
              uploading={uploading}
              fileInputRef={fileInputRef}
            />
          ) : (
            // Regular image grid
            <ImageGrid images={getImages(activeCat)} onSelect={onSelect} />
          )}
        </div>
      </div>
    </div>
  );
}

function AddedImagesGrid({ images, onSelect, onDelete, onUpload, uploading, fileInputRef }) {
  if (images.length === 0) {
    return (
      <div className="mini-images-empty">
        <Upload size={28} color="#444" />
        <p>No uploaded images yet</p>
        <button
          className="mini-upload-btn-lg"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Plus size={13} /> Upload image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => onUpload(Array.from(e.target.files))}
        />
      </div>
    );
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
          <button
            className="mini-delete-btn"
            onClick={(e) => onDelete(e, img)}
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ))}
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
        <div key={img.id} className="mini-images-item" onClick={() => onSelect(img)}>
          <img src={img.url} alt="" loading="lazy" />
        </div>
      ))}
    </div>
  );
}
