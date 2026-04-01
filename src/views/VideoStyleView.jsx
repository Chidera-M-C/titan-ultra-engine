// src/views/VideoStyleView.jsx
import React from 'react';
import { VIDEO_STYLES } from '../data/videoStyles';
import './VideoStyleView.css';

export default function VideoStyleView({ onSelectStyle }) {
  return (
    <div className="vstyle-view">
      <div className="vstyle-header">
        <h1 className="vstyle-title">Video Styles</h1>
        <p className="vstyle-subtitle">Choose a style to start generating videos</p>
      </div>
      <div className="vstyle-grid">
        {VIDEO_STYLES.map((style) => (
          <div
            key={style.id}
            className="vstyle-card"
            onClick={() => onSelectStyle(style)}
          >
            <div className="vstyle-card-bg" style={{ background: style.gradient }} />
            <div className="vstyle-card-content">
              <span className="vstyle-emoji">{style.emoji}</span>
              <h3 className="vstyle-card-title">{style.title}</h3>
              <p className="vstyle-card-desc">{style.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
