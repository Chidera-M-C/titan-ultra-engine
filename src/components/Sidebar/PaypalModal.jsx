import React, { useState, useRef } from 'react';
import { X, Copy, Check, Upload, ImagePlus, FileCheck, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './PaypalModal.css';

const PAYPAL_EMAIL = 'mmandu2022@gmail.com'; // ← replace with your PayPal email

const NOTES = [
  'Send the exact amount shown to the PayPal email above.',
  'Upload your PayPal transfer screenshot as proof of payment.',
  'Once you click "I Have Made This Payment" — your credits will be added instantly.',
  'Credits will be reversed if no payment is received.',
  'No element of "pornography" will appear in your PayPal statement.',
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

function PaypalContent({ pack, onSuccess }) {
  const { user, setCredits } = useAuth();
  const [copied, setCopied]           = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(PAYPAL_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    const userId    = user?.id;
    const userEmail = user?.email;
    if (!receiptFile || !userId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('receipt',        receiptFile);
      form.append('userId',         userId);
      form.append('email',          userEmail);
      form.append('credits',        pack.credits);
      form.append('price',          pack.price);
      form.append('pack',           pack.name);
      form.append('payment_method', 'paypal');
      const res  = await fetch('/api/bank-transfer', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Submission failed');
      setCredits(data.newBalance);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pp-content">
      <div className="ad-pack-badge">
        Paying <span>${pack.price}</span> for <span>{pack.credits} Credits</span>
      </div>

      {/* PayPal email field */}
      <div className="pp-email-section">
        <p className="pp-email-label">Send Payment To</p>
        <div className="ad-field-row pp-email-row">
          <div className="ad-field-left">
            <span className="ad-field-label">PayPal Email</span>
            <span className="ad-field-value">{PAYPAL_EMAIL}</span>
          </div>
          <CopyButton value={PAYPAL_EMAIL} />
        </div>

        <button
          className={`pp-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopyEmail}
        >
          {copied ? <><Check size={13} /><span>Copied!</span></> : <><Copy size={13} /><span>Copy Email</span></>}
        </button>
      </div>

      {/* Upload receipt */}
      <div className="ad-upload-section">
        <p className="ad-upload-section-label">
          <Upload size={11} />
          Upload Transfer Screenshot
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

export default function PaypalModal({ pack, onClose }) {
  const [success, setSuccess] = useState(false);

  if (!pack) return null;

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
            <h3 className="ad-title">Pay via PayPal</h3>

            <PaypalContent pack={pack} onSuccess={() => setSuccess(true)} />

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
