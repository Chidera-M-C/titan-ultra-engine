import React, { useState } from 'react';
import { X, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import './TelegramModal.css';

const PACKAGES = [
  { id: 'starter', name: 'Starter',  credits: 100,  stars: 750  },
  { id: 'creator', name: 'Creator',  credits: 500,  stars: 3000 },
  { id: 'master',  name: 'Master',   credits: 1500, stars: 7500 },
];

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.928l-2.956-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.884.631z"/>
    </svg>
  );
}

export default function TelegramModal({ isOpen, onClose, onCreditsUpdated, userId }) {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, message }
  const [error, setError] = useState('');

  const reset = () => {
    setSelectedPackage(null);
    setCode('');
    setLoading(false);
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleRedeem = async () => {
    if (!code.trim() || !selectedPackage) return;
    if (code.trim().length !== 8) {
      setError('Code must be exactly 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    console.log('Redeem payload:', { code: code.trim().toUpperCase(), package_id: selectedPackage, user_id: userId });

    try {
      const res = await fetch('/api/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          package_id: selectedPackage,
          user_id: userId,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong.');
      } else {
        setResult({
          success: true,
          message: `✅ ${data.credits_added} credits added! New balance: ${data.new_total} credits.`,
        });
        if (onCreditsUpdated) onCreditsUpdated(data.new_total);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tg-overlay" onClick={handleClose}>
      <div className="tg-modal" onClick={e => e.stopPropagation()}>
        <button className="tg-close" onClick={handleClose}><X size={18} /></button>

        <div className="tg-header">
          <div className="tg-icon-wrap"><TelegramIcon /></div>
          <h2>Pay with Telegram Stars</h2>
          <p>Buy a code via our Telegram bot, then enter it below.</p>
        </div>

        {/* Step 1 — pick package */}
        <div className="tg-section">
          <label className="tg-label">1. Select your package</label>
          <div className="tg-packages">
            {PACKAGES.map(pkg => (
              <button
                key={pkg.id}
                className={`tg-pkg-btn ${selectedPackage === pkg.id ? 'tg-pkg-btn--active' : ''}`}
                onClick={() => { setSelectedPackage(pkg.id); setError(''); setResult(null); }}
              >
                <span className="tg-pkg-name">{pkg.name}</span>
                <span className="tg-pkg-credits">{pkg.credits} credits</span>
                <span className="tg-pkg-stars">⭐ {pkg.stars.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — get code from bot */}
        <div className="tg-section">
          <label className="tg-label">2. Get your code from our bot</label>
          <a
            href="https://t.me/NudelyTopupBot"
            target="_blank"
            rel="noopener noreferrer"
            className="tg-bot-link"
          >
            <TelegramIcon />
            Open @NudelyTopupBot on Telegram
          </a>
          <p className="tg-hint">
            Pick a package in the bot, pay with Stars on your <strong>mobile Telegram app</strong>, 
            and your 8-character code will be sent to you instantly.
            Code is valid for 7 days. Never share it — it's single-use.
          </p>
        </div>

        {/* Step 3 — enter code */}
        <div className="tg-section">
          <label className="tg-label">3. Enter your 8-character code</label>
          <input
            className="tg-code-input"
            type="text"
            placeholder="e.g. U3HG4KR9"
            maxLength={8}
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
              setError('');
              setResult(null);
            }}
            disabled={loading || result?.success}
          />
        </div>

        {error && (
          <div className="tg-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {result?.success && (
          <div className="tg-success">
            <CheckCircle size={15} />
            <span>{result.message}</span>
          </div>
        )}

        {result?.success ? (
          <button className="tg-submit-btn" onClick={handleClose}>Done</button>
        ) : (
          <button
            className="tg-submit-btn"
            onClick={handleRedeem}
            disabled={loading || !selectedPackage || code.length !== 8}
          >
            {loading ? <><Loader2 size={15} className="tg-spin" /> Applying...</> : 'Apply Code'}
          </button>
        )}
      </div>
    </div>
  );
}
