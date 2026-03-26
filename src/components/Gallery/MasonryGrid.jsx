import './Gallery.css';
import React, { useState, useEffect } from 'react';
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
  const [liked, setLiked]   = useState(initialLiked);
  const [likes, setLikes]   = useState(initialLikes);
  const [busy, setBusy]     = useState(false);

  useEffect(() => {
    setLiked(initialLiked);
    setLikes(initialLikes);
  }, [initialLiked, initialLikes]);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user || busy) return;

    setBusy(true);
    const newLiked = !liked;

    // Optimistic update
    setLiked(newLiked);
    setLikes(prev => Math.max(0, newLiked ? prev + 1 : prev - 1));

    try {
      if (newLiked) {
        // Insert like record
        const { error: likeError } = await supabase
          .from('image_likes')
          .insert({ user_id: user.id, image_id: imageId });

        if (likeError) throw likeError;

        // Increment count via RPC — avoids stale state race condition
        await supabase.rpc('increment_likes', { image_id: imageId });

        // Notify image owner — non-fatal, run after like is confirmed
        const { data: imgData } = await supabase
          .from('images')
          .select('user_id')
          .eq('id', imageId)
          .single();

        if (imgData && imgData.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id:  imgData.user_id,
            type:     'like',
            title:    'Someone liked your image',
            message:  'Your image just got a like!',
            image_id: imageId,
          });
        }

      } else {
        // Delete like record
        const { error: unlikeError } = await supabase
          .from('image_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('image_id', imageId);

        if (unlikeError) throw unlikeError;

        // Decrement count via RPC
        await supabase.rpc('decrement_likes', { image_id: imageId });
      }

    } catch (err) {
      console.error('Like failed:', err.message);
      // Revert optimistic update on failure
      setLiked(!newLiked);
      setLikes(prev => Math.max(0, newLiked ? prev - 1 : prev + 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="like-badge" onClick={handleLike} style={{ opacity: busy ? 0.6 : 1 }}>
      <Heart size={16} fill={liked ? '#ff4b4b' : 'none'} color={liked ? '#ff4b4b' : '#fff'} />
      <span>{likes}</span>
    </div>
  );
}

export default function MasonryGrid({ images, promptRef, onImageClick, onSelectPrompt, onEditImage }) {
  const [openId, setOpenId]           = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState(promptRef?.current || '');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrompt(promptRef?.current || '');
    }, 300);
    return () => clearInterval(interval);
  }, [promptRef]);

  useEffect(() => {
    const handleClickOutside = () => setOpenId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="masonry-grid">
      {images.map((img) => (
        <div
          key={img.id}
          className="gallery-card"
          onClick={() => { setOpenId(null); onImageClick(img); }}
        >
          <img
            src={img.url}
            alt="Generated AI image"
            loading="lazy"
            className="allow-visitor"
          />

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
                  const cp = currentPrompt.trim();
                  const ip = (img.prompt || '').trim();
                  if (cp === ip && cp !== '') {
                    onSelectPrompt('');
                  } else {
                    onSelectPrompt(img.prompt);
                  }
                }}
              >
                <RotateCcw size={15} />
                <span>{currentPrompt.trim() === (img.prompt || '').trim() && currentPrompt ? 'Unload prompt' : 'Load prompt'}</span>
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
