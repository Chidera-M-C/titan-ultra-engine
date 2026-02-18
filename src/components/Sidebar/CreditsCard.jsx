import React, { useState } from 'react';
import { Functions } from 'appwrite'; 
import { client } from '../../lib/appwrite'; // Corrected path to src/lib/appwrite.js
import TopUpModal from './TopUpModal';
import './CreditsCard.css'; // Verified path from saved info

export default function CreditsCard({ credits, userId }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePackSelect = async (pack) => {
    setLoading(true);
    const functions = new Functions(client);

    try {
      // Triggers the Appwrite function you deployed
      const execution = await functions.createExecution(
        'nowpayments-handler', // Ensure this matches your Function ID exactly
        JSON.stringify({
          price: pack.price,
          credits: pack.credits,
          userId: userId
        })
      );

      // Parse the response from your Node.js function
      const response = JSON.parse(execution.responseBody);

      if (response.url) {
        // Redirect the user to the NOWPayments checkout page
        window.location.href = response.url;
      } else {
        console.error("No payment URL in response:", response);
        alert("Could not generate payment link.");
      }
    } catch (err) {
      console.error("Payment trigger failed:", err);
      alert("Payment system error. Please check console.");
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
