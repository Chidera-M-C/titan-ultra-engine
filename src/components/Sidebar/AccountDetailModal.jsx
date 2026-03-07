import React from 'react';
import { X } from 'lucide-react';
import './AccountDetailModal.css';

export default function AccountDetailModal({ pack, onClose }) {
  if (!pack) return null;

  return (
    <div className="account-detail-overlay" onClick={onClose}>
      <div className="account-detail-box" onClick={e => e.stopPropagation()}>
        <button className="account-detail-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <p style={{ color: 'white' }}>Account details for {pack.name} — ${pack.price}</p>
      </div>
    </div>
  );
}
