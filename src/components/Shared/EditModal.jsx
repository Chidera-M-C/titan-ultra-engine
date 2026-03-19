import React, { useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { PulseLoader } from './Loader';
import './EditModal.css';

export default function EditModal({ image, loading, error, resultImage, onClose, onRetry, originalPrompt }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

  const handleClose = (e) => {
    e.stopPropagation();
    if (!loading) onClose();
  };

  const toggleMinimize = (e) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const handleEdit = () => {
    if (!editPrompt.trim() || loading) return;
    onRetry(editPrompt);
  };

  return (
    <div className={`edit-modal ${isMinimized ? 'minimized' : ''}`}>
      <div className="edit-content">

        <div className="edit-modal-header" onClick={toggleMinimize}>
          <div className="edit-status-text">
            <span className={`edit-status-dot ${loading ? 'generating' : ''}`}></span>
            {loading ? 'Editing image...' : error ? 'Edit failed' : resultImage ? 'Edit complete' : 'Ready to edit'}
          </div>
          <div className="edit-header-actions">
            <button className="edit-minimize-btn" onClick={toggleMinimize}>
              {isMinimized ? '▲' : '−'}
            </button>
            {!loading && (
              <button className="edit-close-btn" onClick={handleClose}>✕</button>
            )}
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="edit-image-stage">

              {/* LOADING */}
              {loading && (
                <div className="edit-loading-wrapper">
                  <PulseLoader />
                  <p className="edit-loading-label">Making your changes...</p>
                </div>
              )}

              {/* ERROR */}
              {error && !loading && (
                <div className="edit-error-wrapper">
                  <AlertCircle size={32} color="#ff4444" />
                  <p className="edit-error-title">Edit Failed</p>
                  <p className="edit-error-message">{error}</p>
                  <button className="edit-retry-btn" onClick={handleEdit}>
                    Try Again
                  </button>
                </div>
              )}

              {/* RESULT IMAGE — show edited result if available, otherwise original */}
              {!loading && !error && (
                <img
                  src={resultImage || image}
                  alt="Image"
                  className="edit-gen-result"
                />
              )}

            </div>

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
