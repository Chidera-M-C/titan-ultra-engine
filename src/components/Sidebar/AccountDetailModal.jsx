import React from 'react';
import { createPortal } from 'react-dom';
import './AccountDetailModal.css';

export default function AccountDetailModal({ isOpen, onClose, selectedPack }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="account-detail-overlay" onClick={onClose}>
      <div className="account-detail-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ color: '#00ff00', textAlign: 'center', fontSize: '28px' }}>
          ✅ BANK MODAL OPENED!
        </h2>
        <p style={{ color: 'white', textAlign: 'center', fontSize: '20px' }}>
          Pack: {selectedPack?.name || 'NO PACK'}
        </p>
        <button 
          onClick={onClose}
          style={{ 
            marginTop: '30px', 
            padding: '12px 30px', 
            background: '#a855f7', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Close Modal
        </button>
      </div>
    </div>,
    document.body
  );
}
