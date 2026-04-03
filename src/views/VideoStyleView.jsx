// src/views/VideoStyleView.jsx
import React, { useState } from 'react';
import { VIDEO_STYLES } from '../data/videoStyles';
import './VideoStyleView.css';

export default function VideoStyleView({ onSelectStyle }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (style) => {
    setSelected(style.id);
    onSelectStyle(style);
  };

  return (
    <div className="vstyle-view">
      <div className="vstyle-header">
        <h2 className="vstyle-title">Choose a Style</h2>
        <p className="vstyle-subtitle">Select a style to set the tone of your video</p>
      </div>

      <div className="vstyle-grid">
        {VIDEO_STYLES.map((style) => (
          <div
            key={style.id}
            className={`vstyle-card-wrapper ${selected === style.id ? 'selected' : ''}`}
            onClick={() => handleSelect(style)}
          >
            <div
              className="vstyle-card"
              style={{ background: style.gradient }}
            >
              <div className="vstyle-card-content">
                <span className="vstyle-card-title">{style.title}</span>
                <span className="vstyle-card-desc">{style.description}</span>
              </div>
              {selected === style.id && (
                <div className="vstyle-card-check">✓</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <p className="vstyle-applied">
          Style applied — head to Text→Video or Image→Video to generate
        </p>
      )}
    </div>
  );
}
