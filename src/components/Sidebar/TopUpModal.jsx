import React, { useState } from 'react';
import { X, Zap, Loader2 } from 'lucide-react';
import './TopUpModal.css';

const CREDIT_PACKS = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 100,
    price: 10,
    description: 'Perfect for quick experiments.',
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 500,
    price: 40,
    description: 'Most popular for creators.',
    popular: true
  },
  {
    id: 'master',
    name: 'Master',
    credits: 1500,
    price: 100,
    description: 'Best value for heavy users.',
    popular: false
  }
];

export default function TopUpModal({ isOpen, onClose, onSelect }) {
  const [processingId, setProcessingId] = useState(null);

  if (!isOpen) return null;

  const handleSelect = async (pack) => {
    if (processingId) return; // Prevent spamming
    setProcessingId(pack.id);
    
    try {
      await onSelect(pack);
    } catch (err) {
      setProcessingId(null);
    }
    // We don't necessarily setProcessingId(null) on success 
    // because the page is about to redirect to the payment URL
  };

  return (
    <div className="modal-overlay" onClick={processingId ? null : onClose}>
      <div className="modal-content glass-effect" onClick={e => e.stopPropagation()}>
        <button 
          className="close-btn" 
          onClick={onClose} 
          disabled={!!processingId}
        >
          <X size={20} />
        </button>
        
        <div className="modal-header">
          <h2 className="modal-title">Boost Your Creative Power</h2>
          <p className="modal-subtitle">Select a pack. You will be redirected to our secure payment provider.</p>
        </div>
        
        <div className="options-grid">
          {CREDIT_PACKS.map((pack) => {
            const isThisProcessing = processingId === pack.id;
            const isAnyProcessing = !!processingId;

            return (
              <div 
                key={pack.id} 
                className={`credit-pack-card ${pack.popular ? 'popular' : ''} ${isThisProcessing ? 'processing' : ''} ${isAnyProcessing && !isThisProcessing ? 'disabled' : ''}`}
                onClick={() => handleSelect(pack)}
              >
                {pack.popular && (
                  <div className="popular-ribbon">
                    <Zap size={12} fill="currentColor" />
                    <span>Most Popular</span>
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
                
                <button className="select-pack-btn" disabled={isAnyProcessing}>
                  {isThisProcessing ? (
                    <Loader2 className="btn-spinner" size={18} />
                  ) : (
                    pack.popular ? 'Get Started' : 'Choose Pack'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
