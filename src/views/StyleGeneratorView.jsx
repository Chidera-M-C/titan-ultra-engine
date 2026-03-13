import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import AspectRatioDropdown from '../components/PromptSection/AspectRatioDropdown';
import MasonryGrid from '../components/Gallery/MasonryGrid';
import './StyleGeneratorView.css';

export default function StyleGeneratorView({ mood, onBack, onGenerate, loading, onViewImage, onEditImage, onSelectPrompt, prompt }) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const finalPrompt = customPrompt.trim()
    ? `${customPrompt}, ${mood.prompt}`
    : mood.prompt;

  const handleGenerate = () => {
    onGenerate(finalPrompt, aspectRatio);
  };

  const loadGallery = async (isLoadMore = false) => {
    if (galleryLoading) return;
    setGalleryLoading(true);
    try {
      const limit = 20;
      const offset = isLoadMore ? galleryImages.length : 0;
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('style', mood.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      const fetched = data.map(doc => ({
        id: doc.id,
        url: doc.image_url,
        prompt: doc.prompt,
      }));
      if (isLoadMore) {
        setGalleryImages(prev => [...prev, ...fetched]);
      } else {
        setGalleryImages(fetched);
      }
      setHasMore(fetched.length === limit);
    } catch (err) {
      console.error('Failed to fetch style gallery:', err);
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, [mood.id]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.querySelector('.scrollable-area');
      if (!scrollable) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !galleryLoading) {
        loadGallery(true);
      }
    };
    const scrollable = document.querySelector('.scrollable-area');
    if (scrollable) {
      scrollable.addEventListener('scroll', handleScroll);
      return () => scrollable.removeEventListener('scroll', handleScroll);
    }
  }, [galleryImages, hasMore, galleryLoading]);

  return (
    <div className="style-gen-view">
      {/* Header banner */}
      <div className="style-gen-banner" style={{ background: mood.gradient }}>
        <button className="style-gen-back" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Styles</span>
        </button>
        <div className="style-gen-mood-info">
          <h2 className="style-gen-title">{mood.title}</h2>
          <p className="style-gen-desc">{mood.description}</p>
        </div>
      </div>

      {/* Prompt input */}
      <div className="style-gen-prompt-section">
        <p className="style-gen-label">Add your own details <span>(optional)</span></p>
        <div className="style-gen-prompt-box">
          <textarea
            className="style-gen-textarea"
            placeholder={`e.g. "blonde woman on a rooftop" — the ${mood.title.toLowerCase()} mood will be applied automatically`}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            disabled={loading}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <div className="style-gen-footer">
            <AspectRatioDropdown value={aspectRatio} onChange={setAspectRatio} />
            <button
              className="style-gen-btn"
              onClick={handleGenerate}
              disabled={loading}
              style={{ background: mood.gradient }}
            >
              {loading ? <div className="spinner" /> : <><Send size={16} /> Generate</>}
            </button>
          </div>
        </div>
      </div>

      {/* Style gallery */}
      <div className="style-gen-gallery">
        <h3 className="style-gen-gallery-title">What people are creating with {mood.title}</h3>
        {galleryImages.length === 0 && !galleryLoading ? (
          <div className="style-gen-gallery-empty">
            <p>No images yet — be the first to generate in this style!</p>
          </div>
        ) : (
          <MasonryGrid
            images={galleryImages}
            prompt={prompt}
            onImageClick={onViewImage}
            onSelectPrompt={onSelectPrompt}
            onEditImage={onEditImage}
          />
        )}
        {galleryLoading && (
          <div className="style-gen-gallery-loading">Loading...</div>
        )}
      </div>
    </div>
  );
}
