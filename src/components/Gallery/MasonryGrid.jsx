import './Gallery.css';
import React, { useState } from 'react';
import { Wand2, Download, Heart, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext';

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

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return;

    const newLiked = !liked;
    setLiked(newLiked);
    setLikes(prev => newLiked ? prev + 1 : prev - 1);

    if (newLiked) {
      await supabase.from('image_likes').insert({ user_id: user.id, image_id: imageId });
      await supabase.from('images').update({ likes: likes + 1 }).eq('id', imageId);
    } else {
      await supabase.from('image_likes').delete().eq('user_id', user.id).eq('image_id', imageId);
      await supabase.from('images').update({ likes: likes - 1 }).eq('id', imageId);
    }
  };

  return (
    <div className="like-badge" onClick={handleLike}>
      <Heart size={13} fill={liked ? '#ff4b4b' : 'none'} color={liked ? '#ff4b4b' : '#fff'} />
      <span>{likes}</span>
    </div>
  );
}

export default function MasonryGrid({ images, promptRef, onImageClick, onSelectPrompt, onEditImage }) {
  return (
    <div className="masonry-grid">
      {images.map((img) => (
        <div
          key={img.id}
          className="gallery-card"
          onClick={() => onImageClick(img)}
        >
          <img
            src={img.url}
            alt="Generated AI image"
            loading="lazy"
            className="allow-visitor"
          />
          <div className="gallery-overlay">
            <div className="overlay-actions">
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentPrompt = promptRef?.current || '';
                  const imagePrompt = img.prompt || '';
                  if (currentPrompt.trim() === imagePrompt.trim() && currentPrompt !== '') {
                    onSelectPrompt('');
                  } else {
                    onSelectPrompt(img.prompt);
                  }
                }}
                data-tooltip={
                  (promptRef?.current || '').trim() === (img.prompt || '').trim() && promptRef?.current
                    ? 'Unload prompt'
                    : 'Load prompt'
                }
              >
                <RotateCcw size={18} color="#ffffff" />
              </button>
              <button
                className="icon-btn"
                onClick={(e) => downloadImage(e, img.url, img.id)}
                data-tooltip="Download image"
              >
                <Download size={18} color="#ffffff" />
              </button>
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditImage(img);
                }}
                data-tooltip="Edit image"
              >
                <Wand2 size={18} color="#ffffff" />
              </button>
            </div>
          </div>

          {/* Always visible like badge */}
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
