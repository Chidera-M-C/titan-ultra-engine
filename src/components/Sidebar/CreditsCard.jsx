import React, { useState } from 'react';
import { client, functions } from '../../lib/appwrite'; 
import TopUpModal from './TopUpModal';
import './CreditsCard.css';

export default function CreditsCard({ credits, userId }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePackSelect = async (pack) => {
    setLoading(true);
    
    try {
      // Using the exact Function ID from your Appwrite screenshot
      const execution = await functions.createExecution(
        '6994fa7d0028a846c264', 
        JSON.stringify({
          price: pack.price,
          credits: pack.credits,
          userId: userId
        })
      );

      // Parse the response from your Node.js function
      const response = JSON.parse(execution.responseBody);

      if (response.url) {
        // This redirects the user to the NOWPayments checkout page
        window.location.href = response.url;
      } else {
        console.error("No URL in response", response);
        alert("Failed to generate payment link. Check Appwrite logs.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      alert("System error. Make sure Function Execute Access is set to 'any'.");
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
