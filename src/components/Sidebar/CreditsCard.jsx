import React, { useState } from 'react';
import { client } from '../../appwrite'; // Make sure you have the Appwrite SDK installed
import { client } from '../../appwrite'; // Import your configured Appwrite client
import TopUpModal from './TopUpModal';

export default function CreditsCard({ credits, userId }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePackSelect = async (pack) => {
    setLoading(true);
    const functions = new Functions(client);

    try {
      // This triggers the 'nowpayments-handler' function you just deployed
      const execution = await functions.createExecution(
        'nowpayments-handler', // EXACT Function ID from Appwrite
        JSON.stringify({
          price: pack.price,
          credits: pack.credits,
          userId: userId
        })
      );

      const response = JSON.parse(execution.responseBody);

      if (response.url) {
        // Redirect to NOWPayments Checkout
        window.location.href = response.url;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (err) {
      console.error("Payment trigger failed:", err);
      alert("System busy. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="credits-card">
        {/* Your existing CreditsCard UI */}
        <button className="topup-btn" onClick={() => setShowModal(true)}>
          {loading ? "Processing..." : "Top Up"}
        </button>
      </div>

      <TopUpModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSelect={handlePackSelect} // This links the UI to the function
      />
    </>
  );
}
