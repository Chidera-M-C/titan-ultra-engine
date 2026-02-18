import React, { useState } from 'react';
import { client, functions } from '../../lib/appwrite'; 
import TopUpModal from './TopUpModal';
import './CreditsCard.css';

export default function CreditsCard({ credits, userId }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePackSelect = async (pack) => {
    setLoading(true);
    
    // Updated with your ACTUAL Function ID
    const FUNCTION_ID = '6994ff8c0026073bc77d'; 

    try {
      console.log("Triggering function:", FUNCTION_ID);
      
      const execution = await functions.createExecution(
        FUNCTION_ID, 
        JSON.stringify({
          price: pack.price,
          credits: pack.credits,
          userId: userId
        })
      );

      // If the function has a bug, the responseBody will tell us why
      const response = JSON.parse(execution.responseBody);

      if (response.url) {
        // SUCCESS: Send them to the payment page
        window.location.href = response.url;
      } else {
        console.error("Function error details:", response);
        alert(`Function Error: ${response.error || 'No payment URL returned'}`);
      }
    } catch (err) {
      console.error("Appwrite Execution Error:", err);
      // If this still hits, it's likely a Permission (401) issue in the Settings tab
      alert(`System Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="credits-card">
        <div className="credits-info">
          <span className="credits-label">Available Credits</span>
          <span className="credits-value">{credits ?? 0}</span>
        </div>
        <button 
          className="topup-btn" 
          onClick={() => setShowModal(true)}
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Top Up Credits"}
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
