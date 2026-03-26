import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Loader2, Building2, Bitcoin } from 'lucide-react';
import './TopUpModal.css';
import AccountDetailModal from './AccountDetailModal';
import PaypalModal from './PaypalModal';

const CREDIT_PACKS = [
  { id: 'starter', name: 'Starter',  credits: 100,  price: 10,  description: 'Perfect for quick experiments.', popular: false },
  { id: 'creator', name: 'Creator',  credits: 500,  price: 40,  description: 'Most popular for creators.',     popular: true  },
  { id: 'master',  name: 'Master',   credits: 1500, price: 100, description: 'Best value for heavy users.',   popular: false }
];

function PayPalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
    </svg>
  );
}

export default function TopUpModal({ isOpen, onClose, onSelect, userId, onCreditsUpdated }) {
  const [loadingPackId, setLoadingPackId] = useState(null);
  const [bankPack, setBankPack]           = useState(null);
  const [paypalPack, setPaypalPack]       = useState(null);
  const userIdRef = useRef(userId);

  useEffect(() => {
    if (userId) userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setBankPack(null);
      setPaypalPack(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePackSelect = async (pack) => {
    if (loadingPackId) return;
    setLoadingPackId(pack.id);
    if (onSelect) await onSelect(pack);
    setLoadingPackId(null);
  };

  const isAnyModalOpen = !!bankPack || !!paypalPack;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>

      <div
        className={`modal-content ${isAnyModalOpen ? 'modal-content--blurred' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="modal-header">
          <h2 className="modal-title">Boost Your Creative Power</h2>
          <p className="modal-subtitle">Select a credit pack to continue generating high-fidelity art.</p>
        </div>

        <div className="options-grid">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`credit-pack-card ${pack.popular ? 'popular' : ''} ${loadingPackId === pack.id ? 'loading' : ''}`}
              onClick={() => handlePackSelect(pack)}
            >
              {pack.popular && (
                <div className="popular-ribbon">
                  <Zap size={10} fill="currentColor" />
                  <span>Popular</span>
                </div>
              )}

              <div className="pack-info">
                <span className="pack-name">{pack.name}</span>
                <div className="pack-credits">
                  <span className="credit-number">{pack.credits}</span>
                  <span className="credit-unit">Credits</span>
                </div>
              </div>

              <div className="pack-pricing">
                <span className="currency">$</span>
                <span className="price-amount">{pack.price}</span>
              </div>

              <p className="pack-desc">{pack.description}</p>

              {/* PayPal — above crypto on desktop */}
              <button
                className="paypal-transfer-btn"
                disabled={loadingPackId !== null}
                onClick={(e) => {
                  e.stopPropagation();
                  setPaypalPack({ ...pack, capturedUserId: userId });
                }}
              >
                <PayPalIcon />
                <span>Pay via PayPal</span>
              </button>

              {/* Crypto */}
              <button
                className="select-pack-btn"
                disabled={loadingPackId !== null}
              >
                {loadingPackId === pack.id ? (
                  <>
                    <Loader2 size={14} className="spinner-icon" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <><Bitcoin size={12} /><span>Pay via Crypto</span></>
                )}
              </button>

              {/* Bank Transfer */}
              <button
                className="bank-transfer-btn"
                disabled={loadingPackId !== null}
                onClick={(e) => {
                  e.stopPropagation();
                  setBankPack({ ...pack, capturedUserId: userId });
                }}
              >
                <Building2 size={12} />
                <span>Pay via Bank Transfer</span>
              </button>
            </div>
          ))}
        </div>

        <p className="modal-footer">Secure payments powered by NOWPayments</p>
      </div>

      <AccountDetailModal
        pack={bankPack}
        onClose={() => setBankPack(null)}
        userId={bankPack?.capturedUserId}
        onCreditsUpdated={onCreditsUpdated}
      />

      <PaypalModal
        pack={paypalPack}
        onClose={() => setPaypalPack(null)}
      />

    </div>,
    document.body
  );
}
