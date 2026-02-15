import React, { useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { PulseLoader } from './Loader';
import './EditModal.css';

export default function EditModal({ image, loading, error, onClose, onRetry, originalPrompt }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

  // Only allow closing when NOT loading
  const handleClose = (e) => {
    e.stopPropagation();
    if (!loading) {
      onClose();
    }
  };

  const toggleMinimize = (e) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const handleEdit = () => {
    if (!editPrompt.trim()) return;
    console.log('Editing with prompt:', editPrompt);
    // This will call your edit/generation function later
    onRetry(editPrompt);
  };

  return (
    <div className={`edit-modal ${isMinimized ? 'minimized' : ''}`}>
      <div className="edit-content">
        
        {/* Header with status - clickable to expand/collapse */}
        <div className="edit-header" onClick={toggleMinimize}>
          <div className="edit-status-text">
            <span className={`edit-status-dot ${loading ? 'generating' : ''}`}></span>
            {loading ? 'Image editing' : error ? 'Edit failed' : 'Ready to edit'}
          </div>
          <div className="edit-header-actions">
            {/* Minimize/Expand button */}
            <button 
              className="edit-minimize-btn"
              onClick={toggleMinimize} 
              data-tooltip={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? '▲' : '−'}
            </button>
            
            {/* Close button - only show when NOT loading */}
            {!loading && (
              <button className="edit-close-btn" onClick={handleClose} data-tooltip="Close">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content area - hidden when minimized */}
        {!isMinimized && (
          <>
            {/* Image preview */}
            <div className="edit-image-stage">
              {/* LOADING STATE */}
              {loading && (
                <div className="edit-loading-wrapper">
                  <PulseLoader />
                  <p className="edit-loading-label">Editing your image...</p>
                </div>
              )}

              {/* ERROR STATE */}
              {error && !loading && (
                <div className="edit-error-wrapper">
                  <AlertCircle size={32} color="#ff4444" />
                  <p className="edit-error-title">Edit Failed</p>
                  <p className="edit-error-message">{error}</p>
                  <button className="edit-retry-btn" onClick={() => onRetry(editPrompt)}>
                    Try Again
                  </button>
                </div>
              )}

              {/* SUCCESS/READY STATE - Show original image */}
              {image && !loading && !error && (
                <img src={image} alt="Image to edit" className="edit-gen-result" />
              )}
            </div>

            {/* Prompt input section */}
            <div className="edit-prompt-section">
              <div className="edit-prompt-label">
                <Sparkles size={14} />
                <span>Describe your changes</span>
              </div>
              <textarea
                className="edit-prompt-input"
                placeholder="Add details, change style, modify elements..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={3}
                disabled={loading}
              />
              {originalPrompt && (
                <div className="edit-original-prompt">
                  <span className="edit-original-label">Original:</span>
                  <span className="edit-original-text">{originalPrompt}</span>
                </div>
              )}
              <button 
                className="edit-generate-btn" 
                onClick={handleEdit}
                disabled={loading || !editPrompt.trim()}
              >
                {loading ? 'Editing...' : 'Apply Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
