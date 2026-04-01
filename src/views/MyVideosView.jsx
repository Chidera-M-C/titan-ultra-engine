import React, { useState, useMemo } from 'react';
import { ArrowLeft, Video, Heart, Download } from 'lucide-react';
import EmptyState from '../components/Shared/EmptyState';
import './MyVideosView.css';

const sortByDate = (arr) =>
  [...(arr || [])].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

const CATEGORIES = [
  {
    key: 'text_to_video',
    label: 'Text → Video',
    icon: Video,
    accent: '#7c3aed',
    filter: (v) => v.generation_type === 'text_to_video' || v.category === 'text_to_video',
  },
  {
    key: 'image_to_video',
    label: 'Image → Video',
    icon: Video,
    accent: '#0ea5e9',
    filter: (v) => v.generation_type === 'image_to_video' || v.category === 'image_to_video',
  },
  {
    key: 'liked',
    label: 'Liked',
    icon: Heart,
    accent: '#e11d48',
    filter: null,
  },
];

function VideoGrid({ videos }) {
  const [playingId, setPlayingId] = useState(null);
  const sorted = useMemo(() => sortByDate(videos), [videos]);

  if (!sorted || sorted.length === 0) {
    return <div className="myvideos-empty"><p>No videos here yet</p></div>;
  }

  const handleDownload = async (e, url, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `ai-video-${id || Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="myvideos-grid">
      {sorted.map((v) => (
        <div
          key={v.id}
          className="myvideos-card"
          onClick={() => setPlayingId(playingId === v.id ? null : v.id)}
        >
          {v.thumbnail_url && playingId !== v.id ? (
            <img src={v.thumbnail_url} alt="Video thumbnail" className="myvideos-thumb" />
          ) : (
            <video
              src={v.video_url}
              className="myvideos-video"
              autoPlay={playingId === v.id}
              loop
              muted={playingId !== v.id}
              controls={playingId === v.id}
            />
          )}
          {playingId !== v.id && <div className="myvideos-play-icon">▶</div>}

          <div className="myvideos-card-footer">
            <span className="myvideos-duration">{v.duration}s</span>
            <div className="myvideos-actions">
              <div className="myvideos-stat">
                <Heart size={12} />
                <span>{v.likes || 0}</span>
              </div>
              <button
                className="myvideos-download"
                onClick={(e) => handleDownload(e, v.video_url, v.id)}
              >
                <Download size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyVideosView({ videos, likedVideos }) {
  const [activeCategory, setActiveCategory] = useState(null);

  const allVideos = videos || [];

  const getVideos = (cat) => {
    if (cat.key === 'liked') return sortByDate(likedVideos || []);
    return sortByDate(allVideos.filter(cat.filter));
  };

  // ←←← REMOVED the early EmptyState return ←←←
  // We now always show the category overview, just like MyImagesView

  if (activeCategory) {
    const cat = CATEGORIES.find(c => c.key === activeCategory);
    const catVideos = getVideos(cat);
    return (
      <div className="myvideos-drilldown">
        <div className="myvideos-drilldown-header">
          <button className="myvideos-back-btn" onClick={() => setActiveCategory(null)}>
            <ArrowLeft size={18} /><span>Back</span>
          </button>
          <div className="myvideos-drilldown-title">
            <cat.icon size={18} color={cat.accent} />
            <h2 style={{ color: cat.accent }}>{cat.label}</h2>
            <span className="myvideos-count">{catVideos.length}</span>
          </div>
        </div>
        <VideoGrid videos={catVideos} />
      </div>
    );
  }

  return (
    <div className="myvideos-overview">
      <div className="myvideos-cards">
        {CATEGORIES.map((cat) => {
          const catVideos = getVideos(cat);
          const cover = catVideos[0];
          return (
            <div
              key={cat.key}
              className="myvideos-cat-card"
              style={{ '--cat-accent': cat.accent }}
              onClick={() => setActiveCategory(cat.key)}
            >
              <div className="myvideos-cat-cover">
                {cover ? (
                  cover.thumbnail_url ? (
                    <img src={cover.thumbnail_url} alt={cat.label} loading="lazy" />
                  ) : (
                    <video src={cover.video_url} muted className="myvideos-cover-video" />
                  )
                ) : (
                  <div className="myvideos-cat-empty-cover">
                    <cat.icon size={32} color={cat.accent} opacity={0.4} />
                  </div>
                )}
                <div className="myvideos-cat-overlay" />
              </div>
              <div className="myvideos-cat-info">
                <div className="myvideos-cat-icon" style={{ background: `${cat.accent}22`, border: `1px solid ${cat.accent}44` }}>
                  <cat.icon size={16} color={cat.accent} />
                </div>
                <div className="myvideos-cat-text">
                  <h3>{cat.label}</h3>
                </div>
                <span className="myvideos-cat-count" style={{ color: cat.accent }}>
                  {catVideos.length}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
