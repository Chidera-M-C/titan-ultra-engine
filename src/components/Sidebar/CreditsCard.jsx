import React, { useState } from 'react';
import { Zap, Plus } from 'lucide-react';
import './CreditsCard.css';
import TopUpModal from './TopUpModal'; // Import from same folder

export default function CreditsCard({ credits = 0, userId }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="credits-card">
        <div className="credits-header">
          <span className="balance-label">Credits Balance</span>
          <div className="credits-display">
            <Zap size={20} className="zap-icon" fill="currentColor" />
            <span className="credit-count">{credits}</span>
          </div>
        </div>
        
        <p className="credits-usage-text">High-priority generation active.</p>

        {/* This button now just opens the UI Box */}
        <button className="topup-btn" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Top Up
        </button>
      </div>

      {/* The UI Box (Modal) */}
      <TopUpModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        userId={userId} 
      />
    </>
  );
}
