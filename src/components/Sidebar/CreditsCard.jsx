import React from 'react';
import { Zap } from 'lucide-react';

export default function CreditsCard() {
  // Replace with real data from auth/context
  const plan = "Pro Plan PRO";
  const creditsLeft = 120;

  return (
    <div className="credits-card">
      <div className="credits-plan">
        <span className="plan-tag">{plan}</span>
      </div>
      <div className="credits-left">
        {creditsLeft} fast generations left
      </div>
      <button className="upgrade-btn">
        <Zap size={16} />
        Upgrade
      </button>
    </div>
  );
}
