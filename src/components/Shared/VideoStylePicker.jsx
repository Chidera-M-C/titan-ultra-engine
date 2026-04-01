// src/components/Video/VideoStylePicker.jsx
import React from 'react';
import { X, Check } from 'lucide-react';
import { VIDEO_STYLES } from '../../data/videoStyles';
import './VideoStylePicker.css';

export default function VideoStylePicker({ selectedStyle, onSelect, onClose }) {
  return (
    <div className="vstyle-picker-overlay" onClick={onClose}>
      <div className="vstyle-picker" onClick={e => e.stopPropagation()}>
        <div className="vstyle-picker-header">
          <p className="vstyle-picker-title">Select Video Style</p>
          <button className="vstyle-picker-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="vstyle-picker-grid">
          {VIDEO_STYLES.map((style) => (
            <button
              key={style.id}
              className={`vstyle-picker-item ${selectedStyle?.id === style.id ? 'selected' : ''}`}
              onClick={() => { onSelect(style); onClose(); }}
            >
              <div className="vstyle-picker-bg" style={{ background: style.gradient }}>
                <span className="vstyle-picker-emoji">{style.emoji}</span>
                {selectedStyle?.id === style.id && (
                  <div className="vstyle-picker-check"><Check size={10} /></div>
                )}
              </div>
              <span className="vstyle-picker-name">{style.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
