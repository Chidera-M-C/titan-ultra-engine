import React, { useState, useEffect } from 'react';
import { Wand2, Download, Heart, RotateCcw, ArrowLeft, Sparkles, ImageIcon, User, Shuffle, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/Shared/EmptyState';
import '../styles/myimages.css'

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

function ImageGrid({ images, onSelectPrompt, onViewImage, onEditImage, prompt }) {
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!images || images.length === 0) {
    return (
      <div className="myimages-empty">
        <p>No images here yet</p>
      </div>
    );
  }

  return (
    <div className="my-images-grid">
      {images.map((img) => (
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
              <button
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenId(null);
                  const currentPrompt = prompt || '';
                  const imagePrompt = img.prompt || '';
                  if (currentPrompt.trim() === imagePrompt.trim() && currentPrompt !== '') {
                    onSelectPrompt('');
                  } else {
                    onSelectPrompt(img.prompt);
                  }
                }}
              >
                <RotateCcw size={15} />
                <span>{(prompt || '').trim() === (img.prompt || '').trim() && prompt ? 'Unload prompt' : 'Load prompt'}</span>
              </button>
              <button
                className="dropdown-item"
                onClick={(e) => { setOpenId(null); downloadImage(e, img.url, img.id); }}
              >
                <Download size={15} />
                <span>Download</span>
              </button>
              <button
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenId(null);
                  onEditImage(img);
                }}
              >
                <Wand2 size={15} />
                <span>Edit image</span>
              </button>
            </div>
          </div>
          <HeartButton
            imageId={img.id}
            initialLikes={img.likes || 0}
            initialLiked={img.liked || false}
          />
        </div>
      ))}
    </div>
  );
}

const CATEGORIES = [
  {
    key: 'generated',
    label: 'Generated',
    description: 'Your AI generated images',
    icon: Sparkles,
    accent: '#7c3aed',
    filter: (img) => !img.category || img.category === '' || (img.category !== 'edit' && img.category !== 'character' && img.category !== 'faceswap'),
  },
  {
    key: 'liked',
    label: 'Liked',
    description: 'Images you have liked',
    icon: Heart,
    accent: '#e11d48',
    filter: (img) => img.liked,
  },
  {
    key: 'character',
    label: 'Character',
    description: 'Images with your characters',
    icon: User,
    accent: '#0ea5e9',
    filter: (img) => img.category === 'character',
  },
  {
    key: 'edited',
    label: 'Edited',
    description: 'Your edited images',
    icon: Pencil,
    accent: '#f59e0b',
    filter: (img) => img.category === 'edit',
  },
  {
    key: 'faceswap',
    label: 'Face Swap',
    description: 'Your face swap results',
    icon: Shuffle,
    accent: '#10b981',
    filter: (img) => img.category === 'faceswap',
  },
];

export default function MyImagesView({ images, likedImages, onSelectPrompt, onViewImage, prompt, onEditImage }) {
  const [activeCategory, setActiveCategory] = useState(null);

  const allImages = images || [];

  // For liked images we merge the separate likedImages array
  const getImages = (cat) => {
    if (cat.key === 'liked') {
      return (likedImages || []);
    }
    return allImages.filter(cat.filter);
  };

  if (activeCategory) {
    const cat = CATEGORIES.find(c => c.key === activeCategory);
    const catImages = getImages(cat);
    return (
      <div className="myimages-drilldown">
        <div className="myimages-drilldown-header">
          <button className="myimages-back-btn" onClick={() => setActiveCategory(null)}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <div className="myimages-drilldown-title">
            <cat.icon size={18} color={cat.accent} />
            <h2 style={{ color: cat.accent }}>{cat.label}</h2>
            <span className="myimages-count">{catImages.length}</span>
          </div>
        </div>
        <ImageGrid
          images={catImages}
          onSelectPrompt={onSelectPrompt}
          onViewImage={onViewImage}
          onEditImage={onEditImage}
          prompt={prompt}
        />
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
