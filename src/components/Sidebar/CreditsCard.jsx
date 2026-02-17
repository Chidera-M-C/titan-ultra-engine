import React from 'react';
import { Zap, Plus } from 'lucide-react';
import './CreditsCard.css'; // Import your new CSS here

export default function CreditsCard({ credits = 0, userId }) {
  
  const handleTopUp = async () => {
    // This is where the magic happens
    // We send the user to NOWPayments to buy a $10 credit pack
    try {
      const response = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'x-api-key': 'YOUR_API_KEY_HERE', // Put your key here
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price_amount: 10.00,
          price_currency: 'usd',
          order_id: userId, // Very important: links the payment to this user
          order_description: '100 AI Image Credits',
          success_url: window.location.origin + '/success',
          cancel_url: window.location.origin + '/cancel'
        })
      });

      const data = await response.json();
      if (data.invoice_url) {
        window.location.href = data.invoice_url; // Send them to pay!
      }
    } catch (error) {
      console.error("Payment failed to start:", error);
      alert("Payment gateway is temporarily down. Try again later.");
    }
  };

  return (
    <div className="credits-card">
      <div className="credits-header">
        <span className="balance-label">Credits Balance</span>
        <div className="credits-display">
          <Zap size={20} className="zap-icon" fill="currentColor" />
          <span className="credit-count">{credits}</span>
        </div>
      </div>
      
      <p className="credits-usage-text">
        High-priority generation active.
      </p>

      <button className="topup-btn" onClick={handleTopUp}>
        <Plus size={16} />
        Top Up
      </button>
    </div>
  );
}
