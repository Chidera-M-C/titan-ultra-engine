import React, { useState } from 'react';
import './StyleView.css';

const MOODS = [
  {
    id: 'romantic',
    title: 'Romantic',
    description: 'Soft, intimate, warm tones',
    prompt: 'romantic mood, soft warm lighting, intimate atmosphere, golden hour glow, gentle bokeh, tender expression, flowing fabric, rose petals, candlelight, dreamy aesthetic',
    gradient: 'linear-gradient(160deg, #3d1a2e, #7b2d52, #c2607a)',
  },
  {
    id: 'playful',
    title: 'Playful',
    description: 'Vibrant, fun, energetic',
    prompt: 'playful mood, vibrant colors, bright natural lighting, fun energetic atmosphere, cheerful expression, dynamic pose, colorful background, summery aesthetic, lively composition',
    gradient: 'linear-gradient(160deg, #1a2a4a, #2d5f8a, #e87c3e)',
  },
  {
    id: 'dark',
    title: 'Dark',
    description: 'Moody, dramatic, intense',
    prompt: 'dark moody aesthetic, dramatic low-key lighting, deep shadows, intense atmosphere, cinematic composition, noir style, smoky haze, mysterious expression, high contrast, black and deep tones',
    gradient: 'linear-gradient(160deg, #0a0a0a, #1a1a2e, #2d1b4e)',
  },
  {
    id: 'ethereal',
    title: 'Ethereal',
    description: 'Dreamy, soft, otherworldly',
    prompt: 'ethereal mood, soft diffused light, dreamy atmosphere, pastel tones, misty background, otherworldly beauty, delicate features, flowing hair, angelic aesthetic, soft glow',
    gradient: 'linear-gradient(160deg, #1a1a3e, #3d2d6e, #7b6ea8)',
  },
  {
    id: 'seductive',
    title: 'Seductive',
    description: 'Bold, confident, magnetic',
    prompt: 'seductive mood, bold confident pose, low key dramatic lighting, magnetic expression, sleek aesthetic, deep shadows, intense eye contact, sultry atmosphere, high fashion editorial',
    gradient: 'linear-gradient(160deg, #1a0a0a, #3d1010, #7b2020)',
  },
  {
    id: 'innocent',
    title: 'Innocent',
    description: 'Pure, natural, candid',
    prompt: 'innocent mood, natural soft daylight, candid authentic expression, clean minimal background, fresh faced beauty, no makeup natural look, airy white tones, gentle smile, pure aesthetic',
    gradient: 'linear-gradient(160deg, #1a2a2a, #2d5a5a, #5a9e9e)',
  },
];

export default function StyleView({ onSelectPrompt }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (mood) => {
    setSelected(mood.id);
    onSelectPrompt(mood.prompt);
  };

  return (
    <div className="style-view">
      <div className="style-header">
        <h2 className="style-title">Choose a Mood</h2>
        <p className="style-subtitle">Select a mood to set the tone of your generation</p>
      </div>

      <div className="style-grid">
        {MOODS.map((mood) => (
          <div
            key={mood.id}
            className={`style-card ${selected === mood.id ? 'selected' : ''}`}
            onClick={() => handleSelect(mood)}
            style={{ background: mood.gradient }}
          >
            <div className="style-card-content">
              <span className="style-card-title">{mood.title}</span>
              <span className="style-card-desc">{mood.description}</span>
            </div>
            {selected === mood.id && (
              <div className="style-card-check">✓</div>
            )}
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
