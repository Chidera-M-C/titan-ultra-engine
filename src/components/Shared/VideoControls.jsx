// src/components/Video/VideoControls.jsx
import React from 'react';
import './VideoControls.css';

export default function VideoControls({ duration, setDuration, motionStrength, setMotionStrength, disabled }) {
  return (
    <div className="video-controls">
      <div className="video-slider-row">
        <div className="video-slider-label">
          <span>Duration</span>
          <span className="video-slider-value">{duration}s</span>
        </div>
        <input
          type="range"
          min={4}
          max={8}
          step={1}
          value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          disabled={disabled}
          className="video-slider"
        />
        <div className="video-slider-ticks">
          {[4,5,6,7,8].map(v => (
            <span key={v} className={duration === v ? 'active' : ''}>{v}s</span>
          ))}
        </div>
      </div>

      <div className="video-slider-row">
        <div className="video-slider-label">
          <span>Motion Strength</span>
          <span className="video-slider-value">{motionStrength.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.3}
          max={1.0}
          step={0.1}
          value={motionStrength}
          onChange={e => setMotionStrength(Number(e.target.value))}
          disabled={disabled}
          className="video-slider"
        />
        <div className="video-slider-hints">
          <span>Subtle</span>
          <span>Intense</span>
        </div>
      </div>
    </div>
  );
}
