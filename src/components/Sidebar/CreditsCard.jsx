import React, { useState } from 'react';
import TopUpModal from './TopUpModal';
import { Zap, Plus } from 'lucide-react';
import './CreditsCard.css';

export default function CreditsCard({ credits, userId }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePackSelect = async (pack) => {
    if (!userId) {
      alert("Please sign in to purchase credits.");
      return;
    }
    
    setLoading(true);

    try {
      // Pointing to your NEW Vercel API endpoint instead of Appwrite Functions
      const response = await fetch('/api/payment-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          price: pack.price, 
          credits: pack.credits, 
          userId: userId 
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to NOWPayments invoice
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Payment link generation failed");
      }
    } catch (err) {
      console.error("Payment error:", err);
      alert(`Connection Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar-card-container">
      <div className="credits-display-card">
        <div className="card-glow" />

        <div className="credits-main-info">
          <div className="zap-icon-wrapper">
            <Zap size={14} fill="#4ade80" color="#4ade80" />
          </div>
          <div className="credits-text-stack">
            <span className="credits-label">Balance</span>
            <span className="credits-count">{credits ?? 0}</span>
          </div>
        </div>

        <button
          className="premium-topup-button"
          onClick={() => setShowModal(true)}
          disabled={loading}
        >
          {loading ? (
            <span className="loading-text">Processing...</span>
          ) : (
            <>
              <Plus size={13} strokeWidth={3} />
              <span>Top Up</span>
            </>
          )}
        </button>
      </div>

      <TopUpModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handlePackSelect}
      />
    </div>
  );
}
