import React, { useState } from 'react';
import { Wand2, Download, Heart, RotateCcw } from 'lucide-react';
import './ActionButtons.css';

export default function ActionButtons({ 
  image, 
  onLoadPrompt, 
  onDownload, 
  onEdit,
  compact = false,
  showLoadPrompt = false 
}) {
  
  const handleDownload = (e) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(image);
    }
  };

  return (
    <div className={`action-buttons ${compact ? 'compact' : ''}`}>
      {/* Load Prompt Button - Only show if enabled */}
      {showLoadPrompt && onLoadPrompt && (
        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            onLoadPrompt();
          }}
          data-tooltip="Load prompt"
        >
          <RotateCcw size={16} color="#ffffff" />
        </button>
      )}

      {/* Download Button */}
      <button
        className="icon-btn"
        onClick={handleDownload}
        data-tooltip="Download image"
      >
        <Download size={16} color="#ffffff" />
      </button>

      {/* Edit Button */}
      {onEdit && (
        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          data-tooltip="Edit image"
        >
          <Wand2 size={16} color="#ffffff" />
        </button>
      )}

      {/* Heart Button */}
      <HeartButton />
    </div>
  );
}

function HeartButton() {
  const [active, setActive] = useState(false);
  
  return (
    <button
      className={`icon-btn ${active ? 'active-heart' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setActive(!active);
      }}
      data-tooltip={active ? 'Unlike' : 'Like'}
    >
      <Heart 
        size={16} 
        color="#ffffff" 
        fill={active ? '#ffffff' : 'none'} 
      />
    </button>
  );
}
