import React from 'react';
import { Zap, Plus } from 'lucide-react';

export default function CreditsCard({ credits = 0, onTopUp }) {
  // Use 'credits' prop to show real data from your user state
  
  return (
    <div className="credits-card">
      <div className="credits-header">
        <span className="balance-label">CREDITS BALANCE</span>
        <div className="credits-display">
          <Zap size={18} className="zap-icon" fill="currentColor" />
          <span className="credit-count">{credits}</span>
        </div>
      </div>
      
      <p className="credits-usage-text">
        Ready for high-speed generation
      </p>

      <button className="topup-btn" onClick={onTopUp}>
        <Plus size={16} />
        Buy Credits
      </button>
    </div>
  );
}
