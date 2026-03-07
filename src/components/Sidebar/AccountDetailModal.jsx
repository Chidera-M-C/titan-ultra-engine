import React from 'react';
import { createPortal } from 'react-dom';
import './AccountDetailModal.css';

export default function AccountDetailModal({ isOpen, onClose, selectedPack }) {
  console.log('AccountDetailModal render:', isOpen, selectedPack);
  if (!isOpen || !selectedPack) return null;

  return createPortal(
    <div className="account-detail-overlay" onClick={onClose}>
      <div className="account-detail-content" onClick={e => e.stopPropagation()}>
        <p style={{ color: 'white' }}>Modal works — {selectedPack?.name}</p>
      </div>
    </div>,
    document.body
  );
}
