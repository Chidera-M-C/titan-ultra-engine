import React, { useState } from 'react';
import { client, functions } from '../../lib/appwrite'; 
import TopUpModal from './TopUpModal';
import './CreditsCard.css';

export default function CreditsCard({ credits, userId }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePackSelect = async (pack) => {
    setLoading(true);
    const FUNCTION_ID = '6994ff8c0026073bc77d'; 

    try {
      const execution = await functions.createExecution(
        FUNCTION_ID, 
        JSON.stringify({
          price: pack.price,
          credits: pack.credits,
          userId: userId
        })
      );

      const response = JSON.parse(execution.responseBody);
      if (response.url) {
        window.location.href = response.url;
      } else {
        alert("Payment link generation failed.");
      }
    } catch (err) {
      alert(`Connection Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar-card-container">
      <div className="credits-display-card">
        <div className="credits-header">
          <span className="credits-label">Available Credits</span>
          <span className="credits-count">{credits ?? 0}</span>
        </div>
        
        <button 
          className="premium-topup-button" 
          onClick={() => setShowModal(true)} 
          disabled={loading}
        >
          {loading ? "Connecting..." : "Top Up"}
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
