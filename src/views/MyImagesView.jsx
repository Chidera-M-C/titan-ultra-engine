import React, { useState } from 'react';
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

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return;

    const newLiked = !liked;

    // Optimistic UI update
    setLiked(newLiked);
    setLikes(prev => Math.max(0, newLiked ? prev + 1 : prev - 1));

    try {
      if (newLiked) {
        await supabase.from('image_likes').insert({ user_id: user.id, image_id: imageId });
        await supabase.rpc('increment_likes', { image_id: imageId });
      } else {
        await supabase.from('image_likes').delete()
          .eq('user_id', user.id)
          .eq('image_id', imageId);
        await supabase.rpc('decrement_likes', { image_id: imageId });
      }
    } catch (err) {
      // Roll back UI if DB write fails
      console.error('Like failed:', err);
      setLiked(!newLiked);
      setLikes(prev => Math.max(0, newLiked ? prev - 1 : prev + 1));
    }
  };

  return (
    <div className="like-badge" onClick={handleLike}>
      <Heart size={13} fill={liked ? '#ff4b4b' : 'none'} color={liked ? '#ff4b4b' : '#fff'} />
      <span>{likes}</span>
    </div>
  );
}

export default function MyImagesView({ images, onSelectPrompt, onViewImage, prompt, onEditImage }) {
  if (!images || images.length === 0) {
    return <EmptyState title="No images yet" description="Generate something first!" />;
  }

  return (
    <div className="my-images-grid">
      {images.map((img) => (
        <div
          key={img.id}
          className="gallery-card"
          onClick={() => onViewImage(img)}
        >
          <img src={img.url} alt="Generated AI image" loading="lazy" />
          <div className="gallery-overlay">
            <div className="overlay-actions">
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentPrompt = prompt || '';
                  const imagePrompt = img.prompt || '';
                  if (currentPrompt.trim() === imagePrompt.trim() && currentPrompt !== '') {
                    onSelectPrompt('');
                  } else {
                    onSelectPrompt(img.prompt);
                  }
                }}
                data-tooltip={
                  (prompt || '').trim() === (img.prompt || '').trim() && prompt ? 'Unload prompt' : 'Load prompt'
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
