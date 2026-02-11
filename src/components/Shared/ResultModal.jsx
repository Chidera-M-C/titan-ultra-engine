import './Shared.css';
import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { PulseLoader } from './Loader';

export default function ResultModal({ image, loading, error, onClose, onRetry }) {
  return (
    <div className="result-modal">
      <div className="result-content">
        <button className="close-result" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="image-stage">
          {/* 1. Loading State */}
          {loading && <PulseLoader message="GPU is cooking your masterpiece..." />}

          {/* 2. Error State */}
          {error && (
            <div className="loading-state" style={{ color: '#ff4444' }}>
              <AlertCircle size={48} />
              <p><strong>Generation Failed</strong></p>
              <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>{error}</p>
              <button className="upgrade-btn" style={{ marginTop: '1rem' }} onClick={onRetry}>
                Try Again
              </button>
            </div>
          )}

          {/* 3. Success State */}
          {image && !loading && (
            <img src={image} alt="Generated result" className="gen-result" />
          )}
        </div>
      </div>
    </div>
  );
}
