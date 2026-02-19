import './Gallery.css';
import React, { useState } from 'react';
import { Wand2, Download, Heart, RotateCcw } from 'lucide-react';

// src/components/Gallery/MasonryGrid.js

// ... (keep your imports the same)

export default function MasonryGrid({ images, onImageClick, onSelectPrompt, onEditImage }) {
  // ... (keep your handleDownload function the same)

  return (
    <div className="masonry-grid">
      {images.map((img) => (
        <div
          key={img.id}
          className="gallery-card"
          onClick={() => onImageClick(img)}
        >
          {/* THE CRITICAL CHANGE: Added 'allow-visitor' class below */}
          <img 
            src={img.url} 
            alt="Generated AI image" 
            loading="lazy" 
            className="allow-visitor" 
          />
          
          <div className="gallery-overlay">
            <div className="overlay-actions">
              {/* Note: We DO NOT add 'allow-visitor' to these buttons 
                  because we WANT them to trigger the login modal */}
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPrompt(img.prompt);
                }}
                data-tooltip="Load prompt"
              >
                <RotateCcw size={18} color="#ffffff" />
              </button>

              <button
                className="icon-btn"
                onClick={(e) => handleDownload(e, img.url, img.id)}
                data-tooltip="Download image"
              >
                <Download size={18} color="#ffffff" />
              </button>

              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditImage(img);
                }}
                data-tooltip="Edit image"
              >
                <Wand2 size={18} color="#ffffff" />
              </button>

              <HeartButton />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ... (keep HeartButton the same)
