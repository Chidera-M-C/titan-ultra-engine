import React, { useState, useRef } from 'react';
import { ImagePlus, X, Shuffle, Download } from 'lucide-react';
import { PulseLoader } from '../components/Shared/Loader';
import { AlertCircle } from 'lucide-react';
import './FaceSwapView.css';

function UploadBox({ label, sublabel, image, onUpload, onRemove, badge }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpload(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpload(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="faceswap-upload-col">
      <div className="faceswap-upload-label-row">
        <p className="faceswap-label">{label}</p>
        <span className="faceswap-badge">{badge}</span>
      </div>
      <p className="faceswap-sublabel">{sublabel}</p>

      {!image ? (
        <div
          className="faceswap-upload-zone"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <ImagePlus size={28} color="#555" />
          <p>Drop image or click to browse</p>
          <span>JPG, PNG up to 10MB</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="faceswap-preview">
          <img src={image} alt={label} />
          <button className="faceswap-remove" onClick={onRemove}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function FaceSwapView({ onSwap, loading, result, error }) {
  const [targetImage, setTargetImage] = useState(null);
  const [sourceImage, setSourceImage] = useState(null);

  const handleSwap = () => {
    if (!targetImage || !sourceImage) return;
    onSwap({ targetImage, sourceImage });
  };

  const handleDownload = async () => {
    if (!result) return;
    try {
      const response = await fetch(result);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `faceswap-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      const link = document.createElement('a');
      link.href = result;
      link.download = `faceswap-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="faceswap-view">
      <div className="faceswap-header">
        <h2 className="faceswap-title">Face Swap</h2>
        <p className="faceswap-subtitle">Upload two images — the scene stays, only the face changes</p>
      </div>

      <div className="faceswap-layout">
        {/* ── Left: inputs ─────────────────────────────────────────── */}
        <div className="faceswap-inputs">
          <div className="faceswap-upload-row">
            <UploadBox
              label="Target Image"
              sublabel="The scene and body that will receive the new face"
              badge="Receives face"
              image={targetImage}
              onUpload={setTargetImage}
              onRemove={() => setTargetImage(null)}
            />

            <div className="faceswap-arrow">→</div>

            <UploadBox
              label="Source Face"
              sublabel="The face that will be transplanted onto the target"
              badge="Donates face"
              image={sourceImage}
              onUpload={setSourceImage}
              onRemove={() => setSourceImage(null)}
            />
          </div>

          <button
            className="faceswap-btn"
            onClick={handleSwap}
            disabled={!targetImage || !sourceImage || loading}
          >
            {loading ? (
              <><div className="faceswap-spinner" /> Swapping...</>
            ) : (
              <><Shuffle size={16} /> Swap Face</>
            )}
          </button>
        </div>

        {/* ── Right: result ─────────────────────────────────────────── */}
        <div className="faceswap-result-col">
          <p className="faceswap-label">Result</p>

          {!loading && !result && !error && (
            <div className="faceswap-result-placeholder">
              <p>Your result will appear here</p>
            </div>
          )}

          {loading && (
            <div className="faceswap-result-loading">
              <PulseLoader />
              <p>Swapping face...</p>
            </div>
          )}

          {error && !loading && (
            <div className="faceswap-result-error">
              <AlertCircle size={28} color="#ff4444" />
              <p>{error}</p>
              <button className="faceswap-retry-btn" onClick={handleSwap}>
                Try Again
              </button>
            </div>
          )}

          {result && !loading && !error && (
            <div className="faceswap-result-image">
              <img src={result} alt="Face swap result" />
              <button className="faceswap-download-btn" onClick={handleDownload}>
                <Download size={15} /> Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
