import React from 'react';
import { Zap } from 'lucide-react';

export default function CreditsCard() {
  return (
    <div className="credits-card">
      <div className="credits-header">
        <span>Pro Plan</span>
        <span className="badge">PRO</span>
      </div>
      <div className="progress-bar">
        <div className="fill" style={{ width: '60%' }}></div>
      </div>
      <p>120 fast generations left</p>
      <button className="upgrade-btn">
        <Zap size={14} fill="white" /> Upgrade
      </button>
    </div>
  );
}
