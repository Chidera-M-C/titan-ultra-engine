// src/components/Sidebar/TopUpModal.jsx
import React from 'react';
import { X, Zap } from 'lucide-react';
import './TopUpModal.css';

const CREDIT_OPTIONS = [
  { id: 'small', credits: 50, price: 5, label: '$5.00' },
  { id: 'medium', credits: 100, price: 10, label: '$10.00' },
  { id: 'large', credits: 250, price: 20, label: '$20.00' },
];

export default function TopUpModal({ isOpen, onClose, userId }) {
  if (!isOpen) return null;

  const handleSelectOption = async (option) => {
    try {
      // In production, this call should go to your backend/Appwrite Function
      const response = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'x-api-key': 'YOUR_API_KEY', // Swap with your actual key
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price_amount: option.price,
          price_currency: 'usd',
          pay_currency: 'usdc', // As we discussed: USDC
          order_id: userId,
          order_description: `${option.credits} Credits Top-up`,
          success_url: window.location.origin,
        })
      });

      const data = await response.json();
      if (data.invoice_url) window.location.href = data.invoice_url;
    } catch (err) {
      console.error("Payment Error:", err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><X size={20}/></button>
        
        <h2 className="modal-title">Refuel Credits</h2>
        <p className="modal-subtitle">Select a pack to continue generating.</p>
        
        <div className="options-grid">
          {CREDIT_OPTIONS.map((opt) => (
            <div key={opt.id} className="credit-option" onClick={() => handleSelectOption(opt)}>
              <div className="option-info">
                <Zap size={18} fill="#FFD700" color="#FFD700" />
                <span className="option-amount">{opt.credits} Credits</span>
              </div>
              <span className="option-price">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
