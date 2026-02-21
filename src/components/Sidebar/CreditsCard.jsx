import React, { useState } from 'react';
import { functions } from '../../lib/appwrite';
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
    const FUNCTION_ID = '6994ff8c0026073bc77d';
    try {
      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({ price: pack.price, credits: pack.credits, userId })
      );
      if (execution.status === 'completed') {
        const response = JSON.parse(execution.responseBody);
        if (response.url) {
          window.location.href = response.url;
        } else {
          alert("Payment link generation failed: " + (response.error || "Unknown error"));
        }
      } else {
        throw new Error("Function failed to execute");
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
