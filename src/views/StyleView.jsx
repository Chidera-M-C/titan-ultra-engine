// src/views/StyleView.jsx
import React, { useState } from 'react';
import { IMAGE_STYLES } from '../data/imageStyles';
import './StyleView.css';

export default function StyleView({ onSelectStyle }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (mood) => {
    setSelected(mood.id);
    onSelectStyle(mood);
  };

  return (
    <div className="style-view">
      <div className="style-header">
        <h2 className="style-title">Choose a Mood</h2>
        <p className="style-subtitle">Select a mood to set the tone of your generation</p>
      </div>

      <div className="style-grid">
        {IMAGE_STYLES.map((mood) => (
          <div
            key={mood.id}
            className={`style-card-wrapper ${selected === mood.id ? 'selected' : ''}`}
            onClick={() => handleSelect(mood)}
          >
            <div
              className="style-card"
              style={mood.image
                ? { backgroundImage: `url(${mood.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: mood.gradient }
              }
            >
              <div className="style-card-content">
                <span className="style-card-title">{mood.title}</span>
                <span className="style-card-desc">{mood.description}</span>
              </div>
              {selected === mood.id && (
                <div className="style-card-check">✓</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <p className="style-applied">
          Mood applied — head to the prompt box and hit generate
        </p>
      )}
    </div>
  );
}
