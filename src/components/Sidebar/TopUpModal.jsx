// src/components/Sidebar/TopUpModal.jsx
import React from 'react';
import { X, Zap } from 'lucide-react';
import './TopUpModal.css';

const CREDIT_PACKS = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 100,
    price: 10,
    description: 'Perfect for quick experiments.',
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 500,
    price: 40,
    description: 'Most popular for creators.',
    popular: true // We will highlight this one
  },
  {
    id: 'master',
    name: 'Master',
    credits: 1500,
    price: 100,
    description: 'Best value for heavy users.',
    popular: false
  }
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
