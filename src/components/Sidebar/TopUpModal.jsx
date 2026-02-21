import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Loader2 } from 'lucide-react';
import './TopUpModal.css';

// Order: starter, popular (pro), master — popular in the middle
const CREDIT_PACKS = [
  { id: 'starter', name: 'Starter',  credits: 100,  price: 10,  description: 'Perfect for quick experiments.', popular: false },
  { id: 'pro',     name: 'Pro Pack', credits: 500,  price: 40,  description: 'Most popular for creators.',     popular: true  },
  { id: 'master',  name: 'Master',   credits: 1500, price: 100, description: 'Best value for heavy users.',   popular: false }
];

export default function TopUpModal({ isOpen, onClose, onSelect }) {
  const [loadingPackId, setLoadingPackId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePackSelect = async (pack) => {
    if (loadingPackId) return;
    setLoadingPackId(pack.id);
    if (onSelect) await onSelect(pack);
    setLoadingPackId(null);
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="modal-header">
          <h2 className="modal-title">Boost Your Creative Power</h2>
          <p className="modal-subtitle">Select a credit pack to continue generating high-fidelity art.</p>
        </div>

        <div className="options-grid">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`credit-pack-card ${pack.popular ? 'popular' : ''} ${loadingPackId === pack.id ? 'loading' : ''}`}
              onClick={() => handlePackSelect(pack)}
            >
              {pack.popular && (
                <div className="popular-ribbon">
                  <Zap size={10} fill="currentColor" />
                  <span>Popular</span>
                </div>
              )}

              <div className="pack-info">
                <span className="pack-name">{pack.name}</span>
                <div className="pack-credits">
                  <span className="credit-number">{pack.credits}</span>
                  <span className="credit-unit">Credits</span>
                </div>
              </div>

              <div className="pack-pricing">
                <span className="currency">$</span>
                <span className="price-amount">{pack.price}</span>
              </div>

              <p className="pack-desc">{pack.description}</p>

              <button
                className="select-pack-btn"
                disabled={loadingPackId !== null}
              >
                {loadingPackId === pack.id ? (
                  <>
                    <Loader2 size={14} className="spinner-icon" />
                    <span>Processing...</span>
                  </>
                ) : (
                  pack.popular ? 'Get Started' : 'Choose Pack'
                )}
              </button>
            </div>
          ))}
        </div>

        <p className="modal-footer">Secure payments powered by NOWPayments</p>
      </div>
    </div>,
    document.body
  );
}
