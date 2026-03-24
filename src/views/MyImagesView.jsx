import React, { useState, useEffect } from 'react';
import { Wand2, Download, Heart, RotateCcw } from 'lucide-react';
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

export default function MyImagesView({ images, onSelectPrompt, onViewImage, prompt, onEditImage }) {
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!images || images.length === 0) {
    return <EmptyState title="No images yet" description="Generate something first!" />;
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
