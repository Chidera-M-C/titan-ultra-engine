import React, { useState } from 'react';
import { client, functions } from '../../lib/appwrite'; 
import TopUpModal from './TopUpModal';
import './CreditsCard.css';

export default function CreditsCard({ credits, userId }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePackSelect = async (pack) => {
    setLoading(true);
    
    // TRIPLE CHECK THIS ID in your Appwrite Dashboard Settings tab
    const FUNCTION_ID = '6994fa7d0028a846c264'; 

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

      // Log the full execution for debugging if it fails
      console.log("Execution Response:", execution);

      const response = JSON.parse(execution.responseBody);

      if (response.url) {
        window.location.href = response.url;
      } else {
        console.error("No URL in response", response);
        alert(`Error: ${response.error || 'Failed to generate payment link.'}`);
      }
    } catch (err) {
      console.error("Appwrite Function Error:", err);
      // This alert will now tell us if it's a 404 (ID issue) or 401 (Permissions issue)
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
