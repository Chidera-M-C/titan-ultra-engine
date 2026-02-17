import React from 'react';
import { X, Zap } from 'lucide-react';
import './TopUpModal.css';

// 1. You MUST define this array so the .map() has something to read
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
  // 2. Safety check: If not open, don't even try to render
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>
        
        <h2 className="modal-title">Choose your pack</h2>
        <p className="modal-subtitle">Credits never expire and work with all models.</p>
        
        <div className="options-grid">
          {CREDIT_PACKS.map((pack) => (
            <div 
              key={pack.id} 
              className={`credit-pack-card ${pack.popular ? 'popular' : ''}`}
              onClick={() => onSelect && onSelect(pack)}
            >
              {pack.popular && <span className="popular-badge">Best Value</span>}
              <span className="pack-name">{pack.name}</span>
              <div className="pack-credits">
                <Zap size={24} fill="#FFD700" color="#FFD700" />
                {pack.credits}
              </div>
              <span className="pack-price">${pack.price}</span>
              <p className="pack-desc">{pack.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
