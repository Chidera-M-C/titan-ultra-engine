import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wand2, Download, Heart, RotateCcw, ArrowLeft, Sparkles, User, Shuffle, Pencil, Upload, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/Shared/EmptyState';

const downloadImage = async (e, url, imageId) => {
  e.stopPropagation();
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `ai-generated-${imageId || Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error('Download failed:', err);
  }
};

function HeartButton({ imageId, initialLikes = 0, initialLiked = false }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);

  useEffect(() => {
    setLiked(initialLiked);
    setLikes(initialLikes);
  }, [initialLiked, initialLikes]);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes(prev => Math.max(0, newLiked ? prev + 1 : prev - 1));
    try {
      const { error } = await supabase.rpc('toggle_like', {
        p_user_id: user.id,
        p_image_id: imageId,
      });
      if (error) throw error;
    } catch (err) {
      console.error('Like failed:', err);
      setLiked(!newLiked);
      setLikes(prev => Math.max(0, newLiked ? prev - 1 : prev + 1));
    }
  };

  return (
    <div className="like-badge" onClick={handleLike}>
      <Heart size={16} fill={liked ? '#ff4b4b' : 'none'} color={liked ? '#ff4b4b' : '#fff'} />
      <span>{likes}</span>
    </div>
  );
}

const sortByDate = (arr) =>
  [...(arr || [])].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
    const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

// ── Added Images Grid ─────────────────────────────────────────────────────
function AddedImagesGrid({ images, onDelete, onUpload, uploading }) {
  const fileInputRef = useRef(null);
  const sorted = useMemo(() => sortByDate(images), [images]);

  return (
    <>
      <div className="added-images-toolbar">
        <button className="added-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <div className="added-spinner" /> : <Plus size={15} />}
          <span>{uploading ? 'Uploading...' : 'Add Image'}</span>
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

      {sorted.length === 0 ? (
        <div className="myimages-empty">
          <Upload size={32} color="#333" />
          <p style={{ marginTop: 8 }}>No uploaded images yet</p>
          <button className="added-upload-btn-lg" onClick={() => fileInputRef.current?.click()}>
            <Plus size={14} /> Upload your first image
          </button>
        </div>
      ) : (
        <div className="my-images-grid">
          {sorted.map((img) => (
            <div key={img.id} className="gallery-card">
              <img src={img.url || img.image_url} alt={img.name || 'Uploaded'} loading="lazy" />
              <button
                className="added-delete-btn"
                onClick={e => { e.stopPropagation(); onDelete(img); }}
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Standard image grid ───────────────────────────────────────────────────
function ImageGrid({ images, onSelectPrompt, onViewImage, onEditImage, prompt }) {
  const [openId, setOpenId] = useState(null);
  const [ready, setReady] = useState(false);
  const sorted = useMemo(() => sortByDate(images), [images]);

  useEffect(() => {
    setReady(false);
    if (!sorted || sorted.length === 0) { setReady(true); return; }
    let cancelled = false;
    Promise.all(
      sorted.map(img => new Promise(resolve => {
        const i = new Image();
        i.onload = resolve;
        i.onerror = resolve;
        i.src = img.url;
      }))
    ).then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [sorted]);

  useEffect(() => {
    const handleClickOutside = () => setOpenId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!sorted || sorted.length === 0) {
    return <div className="myimages-empty"><p>No images here yet</p></div>;
  }

  return (
    <>
      {!ready && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 0' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
      <div className="my-images-grid" style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        {sorted.map((img) => (
          <div
            key={img.id}
            className="gallery-card"
            onClick={() => { setOpenId(null); onViewImage(img); }}
          >
            <img src={img.url} alt="Generated AI image" loading="lazy" />
            <div
              className={`more-btn ${openId === img.id ? 'open' : ''}`}
              onClick={e => { e.stopPropagation(); setOpenId(openId === img.id ? null : img.id); }}
            >
              <span>···</span>
              <div className="more-dropdown" onClick={e => e.stopPropagation()}>
                <button className="dropdown-item" onClick={(e) => {
                  e.stopPropagation(); setOpenId(null);
                  const currentPrompt = prompt || '';
                  const imagePrompt = img.prompt || '';
                  if (currentPrompt.trim() === imagePrompt.trim() && currentPrompt !== '') {
                    onSelectPrompt('');
                  } else {
                    onSelectPrompt(img.prompt);
                  }
                }}>
                  <RotateCcw size={15} />
                  <span>{(prompt || '').trim() === (img.prompt || '').trim() && prompt ? 'Unload prompt' : 'Load prompt'}</span>
                </button>
                <button className="dropdown-item" onClick={(e) => { setOpenId(null); downloadImage(e, img.url, img.id); }}>
                  <Download size={15} /><span>Download</span>
                </button>
                <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setOpenId(null); onEditImage(img); }}>
                  <Wand2 size={15} /><span>Edit image</span>
                </button>
              </div>
            </div>
            <HeartButton imageId={img.id} initialLikes={img.likes || 0} initialLiked={img.liked || false} />
          </div>
        ))}
      </div>
    </>
  );
}

const CATEGORIES = [
  {
    key: 'generated',
    label: 'Generated',
    description: 'Your AI generated images',
    icon: Sparkles,
    accent: '#7c3aed',
    filter: (img) => 
      (!img.category && !img.style) || 
      (img.category !== 'edit' && img.style !== 'edit' && 
       img.category !== 'character' && img.style !== 'character' && 
       img.category !== 'faceswap' && img.style !== 'faceswap'),
  },
  {
    key: 'liked',
    label: 'Liked',
    description: 'Images you have liked',
    icon: Heart,
    accent: '#e11d48',
    filter: null,
  },
  {
    key: 'character',
    label: 'Character',
    description: 'Images with your characters',
    icon: User,
    accent: '#0ea5e9',
    filter: (img) => img.category === 'character' || img.style === 'character',
  },
  {
    key: 'edited',
    label: 'Edited',
    description: 'Your edited images',
    icon: Pencil,
    accent: '#f59e0b',
    filter: (img) => img.category === 'edit' || img.style === 'edit',
  },
  {
    key: 'faceswap',
    label: 'Face Swap',
    description: 'Your face swap results',
    icon: Shuffle,
    accent: '#10b981',
    filter: (img) => img.category === 'faceswap' || img.style === 'faceswap',
  },
  {
    key: 'added',
    label: 'Added Images',
    description: 'Images you uploaded from your device',
    icon: Upload,
    accent: '#6366f1',
    filter: null, // handled separately with addedImages
  },
];

export default function MyImagesView({ images, likedImages, onSelectPrompt, onViewImage, prompt, onEditImage }) {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState(null);
  const [addedImages, setAddedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const allImages = images || [];

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
        if (file.size > 10 * 1024 * 1024) continue; // skip >10MB
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(path, file, { upsert: false });
        if (uploadError) { console.error('Upload error:', uploadError); continue; }

        const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(path);
        const publicUrl = urlData.publicUrl;

        const { data: dbRow, error: dbError } = await supabase
          .from('user_images')
          .insert({ user_id: user.id, image_url: publicUrl, name: file.name })
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

  const handleDelete = async (img) => {
    if (!user) return;
    try {
      await supabase.from('user_images').delete().eq('id', img.id);
      setAddedImages(prev => prev.filter(i => i.id !== img.id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const getImages = (cat) => {
    if (cat.key === 'liked') return sortByDate(likedImages || []);
    if (cat.key === 'added') return sortByDate(addedImages);
    return sortByDate(allImages.filter(cat.filter));
  };

  if (activeCategory) {
    const cat = CATEGORIES.find(c => c.key === activeCategory);
    const catImages = getImages(cat);

    return (
      <div className="myimages-drilldown">
        <div className="myimages-drilldown-header">
          <button className="myimages-back-btn" onClick={() => setActiveCategory(null)}>
            <ArrowLeft size={18} /><span>Back</span>
          </button>
          <div className="myimages-drilldown-title">
            <cat.icon size={18} color={cat.accent} />
            <h2 style={{ color: cat.accent }}>{cat.label}</h2>
            <span className="myimages-count">{catImages.length}</span>
          </div>
        </div>

        {activeCategory === 'added' ? (
          <AddedImagesGrid
            images={addedImages}
            onDelete={handleDelete}
            onUpload={handleUpload}
            uploading={uploading}
          />
        ) : (
          <ImageGrid
            images={catImages}
            onSelectPrompt={onSelectPrompt}
            onViewImage={onViewImage}
            onEditImage={onEditImage}
            prompt={prompt}
          />
        )}
      </div>
    );
  }

  return (
    <div className="myimages-overview">
      <div className="myimages-cards">
        {CATEGORIES.map((cat) => {
          const catImages = getImages(cat);
          const cover = catImages[0];
          return (
            <div
              key={cat.key}
              className="myimages-cat-card"
              style={{ '--cat-accent': cat.accent }}
              onClick={() => setActiveCategory(cat.key)}
            >
              <div className="myimages-cat-cover">
                {cover ? (
                  <img src={cover.url} alt={cat.label} loading="lazy" />
                ) : (
                  <div className="myimages-cat-empty-cover">
                    <cat.icon size={32} color={cat.accent} opacity={0.4} />
                  </div>
                )}
                <div className="myimages-cat-overlay" />
              </div>
              <div className="myimages-cat-info">
                <div className="myimages-cat-icon" style={{ background: `${cat.accent}22`, border: `1px solid ${cat.accent}44` }}>
                  <cat.icon size={16} color={cat.accent} />
                </div>
                <div className="myimages-cat-text">
                  <h3>{cat.label}</h3>
                  <p>{cat.description}</p>
                </div>
                <span className="myimages-cat-count" style={{ color: cat.accent }}>
                  {catImages.length}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
