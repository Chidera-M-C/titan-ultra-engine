import React, { useState } from 'react';
import './StyleView.css';

const MOODS = [
  {
    id: 'fine_art_monochrome',
    image: '/styles/fine_art_monochrome.jpg',
    title: 'Fine Art Monochrome',
    description: 'Elegant, artistic, high-contrast shadows',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, elegant fine art portrait, solo subject, dramatic chiaroscuro lighting, deep shadows, sharp highlights, detailed skin texture, silk fabric textures, cinematic composition, flawless aesthetics, high fashion editorial, intimate and sophisticated atmosphere',
    gradient: 'linear-gradient(160deg, #1a1a1a, #333333, #555555)',
  },
  {
    id: 'golden_hour_lifestyle',
    image: '/styles/golden_hour_lifestyle.jpg',
    title: 'Golden Hour Lifestyle',
    description: 'Warm, natural, backlit intimacy',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, warm golden hour photography, two people, candid interaction, soft sun flare, backlit hair, natural expressions, outdoor meadow setting, soft focus background, cinematic close-up, organic atmosphere, high detail clothing textures, sunset lighting',
    gradient: 'linear-gradient(160deg, #4d2a00, #8a4a00, #d4a017)',
  },
  {
    id: 'dynamic_urban_street',
    image: '/styles/dynamic_urban_street.jpg',
    title: 'Dynamic Urban Street',
    description: 'Low angle, edgy, high energy',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, dynamic street photography, urban setting, low angle shot, motion blur in background, high energy pose, streetwear fashion, neon city lights, cinematic lighting, sharp focus on subject, gritty textures, modern aesthetic, raw city passion',
    gradient: 'linear-gradient(160deg, #0a1a0a, #1a3d1a, #2d6e2d)',
  },
  {
    id: 'editorial_texture_contrast',
    image: '/styles/editorial_texture_contrast.jpg',
    title: 'Editorial Texture Contrast',
    description: 'Fabric vs skin, macro detail',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, high fashion editorial, contrast between heavy knit fabric and smooth skin, macro photography, detailed textile weave, soft studio lighting, cinematic composition, neutral tones, sophisticated expression, intimate atmosphere, focus on material quality',
    gradient: 'linear-gradient(160deg, #1a1400, #3d3000, #8a6d00)',
  },
  {
    id: 'high_fashion_editorial',
    image: '/styles/high_fashion_editorial.jpg',
    title: 'High Fashion Editorial',
    description: 'Vibrant, bold, dominant presence',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, avant-garde fashion photography, dominant model pose, striking outfit, vibrant color palette, studio setting, low angle shot, cinematic rim lighting, high detail makeup and hair, intense eye contact, luxury brand aesthetic',
    gradient: 'linear-gradient(160deg, #1a0a2a, #3d1a4a, #7b2d7b)',
  },
  {
    id: 'cyberpunk_noir',
    image: '/styles/cyberpunk_noir.jpg',
    title: 'Cyberpunk Noir',
    description: 'Deep blues, neon, moody atmosphere',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, cyberpunk noir aesthetic, rain-slicked streets, deep blue and purple lighting, neon reflections, moody atmosphere, cinematic wide shot, intricate futuristic details, high detail textures, sharp focus, atmospheric haze',
    gradient: 'linear-gradient(160deg, #0a0a1a, #1a1a3d, #2d1b5e)',
  },
  {
    id: 'minimalist_macro',
    image: '/styles/minimalist_macro.jpg',
    title: 'Minimalist Macro',
    description: 'Close-up, clean, focus on detail',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, minimalist macro shot, focus on facial features, dew drops on skin, soft daylight, clean white background, close-up shot, cinematic lighting, high detail iris and skin pores, serene expression, clinical precision',
    gradient: 'linear-gradient(160deg, #1a0a0a, #3d1010, #7b2020)',
  },
  {
    id: 'commercial_group_shot',
    image: '/styles/commercial_group_shot.jpg',
    title: 'Commercial Group Shot',
    description: 'Collaboration, multi-subject, bright',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, professional commercial group photography, diverse team, collaborative atmosphere, bright office lighting, low angle shot, cinematic depth of field, high detail fabric and tech devices, clean modern composition',
    gradient: 'linear-gradient(160deg, #1a0a1a, #3d1a3d, #7b2d7b)',
  },
  {
    id: 'vibrant_pop_art',
    image: '/styles/vibrant_pop_art.jpg',
    title: 'Vibrant Pop Art',
    description: 'Bold colors, high saturation, fun',
    prompt: 'masterpiece, best quality, ultra detailed 8k, photorealistic, vibrant pop art style, two models, bold saturated colors, playful poses, high contrast, studio lighting, close-up intimate shot, energetic atmosphere, high detail clothing, stylized color grading',
    gradient: 'linear-gradient(160deg, #1a0a2a, #3d1a4a, #7b2d7b)',
  },
  {
    id: 'splatter_art_portrait',
    image: '/styles/splatter_art_portrait.jpg',
    title: 'Splatter Art Portrait',
    description: 'Abstract, messy finish, colorful',
    prompt: 'masterpiece, ultra detailed 8k, photorealistic, abstract art portrait, beautiful subject, vibrant paint splatters on face, dripping liquid gold and neon pigments, artistic expression, detailed facial anatomy, close-up shot, soft studio lighting, high detail liquid textures, creative finish',
    gradient: 'linear-gradient(160deg, #1a0a0a, #3d1010, #7b2020)',
  },
];

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
        {MOODS.map((mood) => (
          <div
            key={mood.id}
            className={`style-card-wrapper ${selected === mood.id ? 'selected' : ''}`}
            onClick={() => handleSelect(mood)}
          >
            <div
              className="style-card"
              style={{
                backgroundImage: mood.image ? `url(${mood.image})` : mood.gradient,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
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
