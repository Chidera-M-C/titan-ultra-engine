import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { PulseLoader } from './Loader';
import './ResultModal.css'; // Your new dedicated CSS

export default function ResultModal({ image, loading, error, onClose, onRetry }) {
  // Prevent background clicks from closing while loading
  const handleOverlayClick = () => {
    if (!loading) onClose();
  };

  return (
    <div className="result-modal" onClick={handleOverlayClick}>
      <div className="result-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Close button - hidden during active loading */}
        {!loading && (
          <button className="close-result" onClick={onClose} title="Close">
            <X size={24} />
          </button>
        )}

        <div className="image-stage">
          {/* 1. LOADING STATE */}
          {loading && (
            <div className="loading-wrapper">
              <PulseLoader />
              <p className="loading-label">Visualizing masterpiece...</p>
            </div>
          )}

          {/* 2. ERROR STATE */}
          {error && !loading && (
            <div className="loading-state" style={{ color: '#ff4444', textAlign: 'center', padding: '20px' }}>
              <AlertCircle size={48} style={{ marginBottom: '15px' }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Generation Failed</p>
              <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '5px' }}>{error}</p>
              <button 
                className="icon-btn" 
                style={{ marginTop: '20px', width: 'auto', padding: '0 24px', borderRadius: '30px' }} 
                onClick={onRetry}
              >
                Try Again
              </button>
            </div>
          )}

          {/* 3. SUCCESS STATE */}
          {image && !loading && (
            <img src={image} alt="Generated result" className="gen-result" />
          )}
        </div>
      </div>
    </div>
  );
}
