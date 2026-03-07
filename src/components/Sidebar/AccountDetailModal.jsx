import React, { useState, useRef } from 'react';
import { X, Copy, Check, Share2, Upload, ImagePlus, FileCheck } from 'lucide-react';
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

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleClick = () => inputRef.current?.click();

  const handleInput = (e) => {
    const selected = e.target.files[0];
    if (selected) onFileChange(selected);
  };

  return (
    <div
      className={`ad-upload-box ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="ad-upload-input"
        onChange={handleInput}
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

function TabContent({ details, pack }) {
  const [allCopied, setAllCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);

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

      {/* Receipt upload */}
      <div className="ad-upload-section">
        <p className="ad-upload-section-label">
          <Upload size={11} />
          Upload Transfer Receipt
        </p>
        <UploadBox file={receiptFile} onFileChange={setReceiptFile} />
      </div>

      <button className={`ad-paid-btn ${!receiptFile ? 'disabled' : ''}`} disabled={!receiptFile}>
        I Have Made This Payment
      </button>
    </div>
  );
}

export default function AccountDetailModal({ pack, onClose }) {
  const [activeTab, setActiveTab] = useState('us');

  if (!pack) return null;

  return (
    <div className="account-detail-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="account-detail-box" onClick={e => e.stopPropagation()}>

        <button className="account-detail-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

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
          ? <TabContent details={US_DETAILS} pack={pack} />
          : <TabContent details={INTL_DETAILS} pack={pack} />
        }

        <div className="ad-notes">
          <p className="ad-notes-title">Please Note</p>
          <ul className="ad-notes-list">
            {NOTES.map((note, i) => <li key={i}>{note}</li>)}
          </ul>
        </div>

      </div>
    </div>
  );
}
