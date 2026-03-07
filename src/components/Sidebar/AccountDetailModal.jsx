import React, { useState, useRef } from 'react';
import { X, Copy, Check, Share2, Upload, ImagePlus, FileCheck, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AccountDetailModal.css';

const US_DETAILS = [
  { label: 'Account Name',   value: 'Chidera Ozoaniekwe' },
  { label: 'Bank Name',      value: 'Wells Fargo Bank, N.A.' },
  { label: 'Account Number', value: '40630142032801480' },
  { label: 'Account Type',   value: 'Checking' },
  { label: 'Routing Number', value: '121000248' },
  { label: 'Bank Address',   value: '651 North Broad Street, Suite 206, Middletown, 19709 Delaware, USA' },
];

const INTL_DETAILS = [
  { label: 'Account Name',   value: 'Chidera Ozoaniekwe' },
  { label: 'Bank Name',      value: 'Wells Fargo Bank, N.A.' },
  { label: 'Account Number', value: '40630142032801480' },
  { label: 'Account Type',   value: 'Checking' },
  { label: 'Routing Number', value: '121000248' },
  { label: 'SWIFT Code',     value: 'WFBIUS6S' },
  { label: 'Bank Address',   value: '651 North Broad Street, Suite 206, Middletown, 19709 Delaware, USA' },
];

const NOTES = [
  'Upload the transfer receipt/screenshot for confirmation.',
  'Once you click "I Have Made This Payment" — your credits will be added instantly.',
  'The credits will be reversed if no payment is received.',
  'No element of "pornography" will be recorded in your bank statement or inbox.',
];

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className={`ad-copy-icon ${copied ? 'copied' : ''}`} onClick={handleCopy} title="Copy">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function UploadBox({ file, onFileChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileChange(dropped);
  };

  return (
    <div
      className={`ad-upload-box ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="ad-upload-input"
        onChange={(e) => { if (e.target.files[0]) onFileChange(e.target.files[0]); }}
      />
      {file ? (
        <div className="ad-upload-preview">
          <FileCheck size={20} className="ad-upload-icon-done" />
          <div className="ad-upload-file-info">
            <span className="ad-upload-filename">{file.name}</span>
            <span className="ad-upload-filesize">{(file.size / 1024).toFixed(1)} KB — click to change</span>
          </div>
        </div>
      ) : (
        <div className="ad-upload-empty">
          <div className="ad-upload-icon-wrap">
            <ImagePlus size={20} />
          </div>
          <p className="ad-upload-label">Drop receipt here or <span>browse</span></p>
          <p className="ad-upload-hint">PNG, JPG or PDF — max 5MB</p>
        </div>
      )}
    </div>
  );
}

// Reads userId directly from AuthContext — no prop needed
function TabContent({ details, pack, onSuccess }) {
  const { user, setCredits } = useAuth();
  const [allCopied, setAllCopied]     = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);

  const fullText = details.map(d => `${d.label}: ${d.value}`).join('\n');

  const handleCopyAll = () => {
    navigator.clipboard.writeText(`Payment of $${pack.price} for ${pack.credits} credits\n\n${fullText}`);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareText = `Bank Transfer Details\n\nPayment: $${pack.price} for ${pack.credits} credits\n\n${fullText}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Bank Transfer Details', text: shareText }); } catch {}
    } else {
      navigator.clipboard.writeText(shareText);
    }
  };

  const handleSubmit = async () => {
    const userId = user?.id;
    console.log('handleSubmit fired', { receiptFile, userId, submitting });
    if (!receiptFile || !userId || submitting) return;
    console.log('passed guards, calling API...');
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('receipt', receiptFile);
      form.append('userId',  userId);
      form.append('credits', pack.credits);
      form.append('price',   pack.price);
      form.append('pack',    pack.name);
      const res = await fetch('/api/bank-transfer', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Submission failed');
      setCredits(data.newBalance);
      onSuccess(data.newBalance);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ad-tab-content">
      <div className="ad-pack-badge">
        Paying <span>${pack.price}</span> for <span>{pack.credits} Credits</span>
      </div>

      <div className="ad-fields">
        {details.map((item) => (
          <div className="ad-field-row" key={item.label}>
            <div className="ad-field-left">
              <span className="ad-field-label">{item.label}</span>
              <span className="ad-field-value">{item.value}</span>
            </div>
            <CopyButton value={item.value} />
          </div>
        ))}
      </div>

      <div className="ad-actions">
        <button className={`ad-btn ad-btn-copy ${allCopied ? 'copied' : ''}`} onClick={handleCopyAll}>
          {allCopied ? <Check size={13} /> : <Copy size={13} />}
          <span>{allCopied ? 'Copied!' : 'Copy All Details'}</span>
        </button>
        <button className="ad-btn ad-btn-share" onClick={handleShare}>
          <Share2 size={13} />
          <span>Share</span>
        </button>
      </div>

      <div className="ad-upload-section">
        <p className="ad-upload-section-label">
          <Upload size={11} />
          Upload Transfer Receipt
        </p>
        <UploadBox file={receiptFile} onFileChange={setReceiptFile} />
      </div>

      {error && <p className="ad-submit-error">{error}</p>}

      <button
        className={`ad-paid-btn ${!receiptFile || submitting ? 'disabled' : ''}`}
        disabled={!receiptFile || submitting}
        onClick={handleSubmit}
      >
        {submitting ? 'Processing...' : 'I Have Made This Payment'}
      </button>
    </div>
  );
}

function SuccessScreen({ pack, onClose }) {
  return (
    <div className="ad-success">
      <div className="ad-success-icon">
        <CheckCircle size={36} />
      </div>
      <h4 className="ad-success-title">Payment Confirmed!</h4>
      <p className="ad-success-msg">
        <span>{pack.credits} credits</span> have been added to your account.
      </p>
      <button className="ad-paid-btn" onClick={onClose}>Done</button>
    </div>
  );
}

export default function AccountDetailModal({ pack, onClose }) {
  const [activeTab, setActiveTab] = useState('us');
  const [success, setSuccess]     = useState(false);

  if (!pack) return null;

  const handleSuccess = () => {
    setSuccess(true);
  };

  return (
    <div className="account-detail-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="account-detail-box" onClick={e => e.stopPropagation()}>
        <button className="account-detail-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        {success ? (
          <SuccessScreen pack={pack} onClose={onClose} />
        ) : (
          <>
            <h3 className="ad-title">Bank Transfer Details</h3>

            <div className="ad-tabs">
              <button className={`ad-tab ${activeTab === 'us' ? 'active' : ''}`} onClick={() => setActiveTab('us')}>
                Within US <span className="ad-tab-sub">Wire / ACH</span>
              </button>
              <button className={`ad-tab ${activeTab === 'intl' ? 'active' : ''}`} onClick={() => setActiveTab('intl')}>
                Outside US <span className="ad-tab-sub">Wire / SWIFT</span>
              </button>
            </div>

            {activeTab === 'us'
              ? <TabContent details={US_DETAILS} pack={pack} onSuccess={handleSuccess} />
              : <TabContent details={INTL_DETAILS} pack={pack} onSuccess={handleSuccess} />
            }

            <div className="ad-notes">
              <p className="ad-notes-title">Please Note</p>
              <ul className="ad-notes-list">
                {NOTES.map((note, i) => <li key={i}>{note}</li>)}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
