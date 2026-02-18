import React, { useState } from 'react';
// We import 'functions' (lowercase) which is already initialized in your lib
import { client, functions } from '../../lib/appwrite'; 
import TopUpModal from './TopUpModal';
import './CreditsCard.css';

export default function CreditsCard({ credits, userId }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePackSelect = async (pack) => {
    setLoading(true);
    
    try {
      // We use the 'functions' instance directly here
      const execution = await functions.createExecution(
        'nowpayments-handler', 
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
        console.error("No URL in response", response);
        alert("Failed to generate payment link.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      alert("System error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="credits-card">
        <div className="credits-info">
          <span className="credits-label">Credits</span>
          <span className="credits-value">{credits ?? 0}</span>
        </div>
        <button 
          className="topup-btn" 
          onClick={() => setShowModal(true)}
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Top Up"}
        </button>
      </div>

      <TopUpModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSelect={handlePackSelect} 
      />
    </>
  );
}
