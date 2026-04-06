import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Download } from 'lucide-react';
import { PulseLoader } from './Loader';
import './VideoResultModal.css';

export default function VideoResultModal({ videoUrl, loading, error, onClose, onRetry }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  // Auto-play when video arrives
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [videoUrl]);

  const handleClose = (e) => {
    e.stopPropagation();
    if (!loading) onClose();
  };

  const toggleMinimize = (e) => {
    e.stopPropagation();
    setIsMinimized(v => !v);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else          { v.pause(); setIsPlaying(false); }
  };

  const handleTimeUpdate = () => {
    if (isDragging || !videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleTimelineClick = (e) => {
    const rect = timelineRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * duration;
    if (videoRef.current) videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleDownload = async () => {
    if (!videoUrl) return;
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `ai-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `ai-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`vresult-modal ${isMinimized ? 'minimized' : ''}`}>
      <div className="vresult-content">

        {/* Header */}
        <div className="vresult-header" onClick={toggleMinimize}>
          <div className="vresult-status-text">
            <span className={`vresult-status-dot ${loading ? 'generating' : ''}`} />
            {loading ? 'Video generating' : error ? 'Generation failed' : 'Video complete'}
          </div>
          <div className="vresult-header-actions">
            <button className="vresult-minimize-btn" onClick={toggleMinimize}>
              {isMinimized ? '▲' : '−'}
            </button>
            {!loading && (
              <button className="vresult-close-btn" onClick={handleClose}>✕</button>
            )}
          </div>
        </div>

        {!isMinimized && (
          <div className="vresult-stage">

            {/* Loading */}
            {loading && (
              <div className="vresult-loading-wrapper">
                <PulseLoader />
                <p className="vresult-loading-label">Generating your video...</p>
                <p className="vresult-loading-sub">This may take a minute or two</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="vresult-error-wrapper">
                <AlertCircle size={32} color="#ff4444" />
                <p className="vresult-error-title">Generation Failed</p>
                <p className="vresult-error-msg">{error}</p>
                <button className="vresult-retry-btn" onClick={onRetry}>Try Again</button>
              </div>
            )}

            {/* Video */}
            {videoUrl && !loading && !error && (
              <div className="vresult-video-container">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="vresult-video"
                  loop
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={togglePlay}
                />

                {/* Controls overlay */}
                <div className="vresult-controls">
                  {/* Timeline */}
                  <div
                    className="vresult-timeline"
                    ref={timelineRef}
                    onClick={handleTimelineClick}
                  >
                    <div className="vresult-timeline-track">
                      <div className="vresult-timeline-progress" style={{ width: `${progress}%` }} />
                      <div className="vresult-timeline-thumb" style={{ left: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="vresult-controls-row">
                    <button className="vresult-play-btn" onClick={togglePlay}>
                      {isPlaying ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                          <rect x="2" y="1" width="4" height="12" rx="1"/>
                          <rect x="8" y="1" width="4" height="12" rx="1"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                          <polygon points="2,1 13,7 2,13"/>
                        </svg>
                      )}
                    </button>
                    <span className="vresult-time">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    <button className="vresult-download-btn" onClick={handleDownload} title="Download video">
                      <Download size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
