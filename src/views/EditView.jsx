import React, { useState, useRef } from 'react';
import { ImagePlus, X, Send, Sliders, Zap } from 'lucide-react';
import { PulseLoader } from '../components/Shared/Loader';
import { AlertCircle } from 'lucide-react';
import './EditView.css';

export default function EditView({ onGenerate, loading, image, error, onViewImage, credits }) {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [poseStrength, setPoseStrength] = useState(0.6);
  const [cannyStrength, setCannyStrength] = useState(0.4);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleGenerate = () => {
    if (!uploadedImage || !prompt.trim()) return;
    onGenerate({
      image: uploadedImage,
      prompt,
      negativePrompt,
      poseStrength,
      cannyStrength,
    });
  };

  return (
    <div className="edit-view">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="edit-header">
        <h2 className="edit-title">Edit Image</h2>
        <p className="edit-subtitle">Upload an image and describe the changes you want to make</p>
      </div>

      <div className="edit-layout">

        {/* ── Left: Upload + Controls ─────────────────────────────────── */}
        <div className="edit-left">

          {/* Upload zone */}
          {!uploadedImage ? (
            <div
              className="edit-upload-zone"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <ImagePlus size={32} color="#555" />
              <p className="edit-upload-title">Drop your image here</p>
              <p className="edit-upload-sub">or click to browse — PNG, JPG up to 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="edit-image-preview">
              <img src={uploadedImage} alt="Uploaded" />
              <button
                className="edit-image-remove"
                onClick={() => setUploadedImage(null)}
              >
                <X size={14} />
              </button>
              <span className="edit-image-badge">Source image</span>
            </div>
          )}

          {/* Prompt box */}
          <div className="edit-prompt-section">
            <div className="edit-prompt-row">
              <div className="edit-prompt-block edit-prompt-main">
                <p className="edit-prompt-label">Edit instruction</p>
                <div className="edit-prompt-box">
                  <textarea
                    className="edit-textarea"
                    placeholder='e.g. "sitting on a chair, looking over shoulder, same background"'
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={loading}
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="edit-prompt-block edit-prompt-negative">
                <p className="edit-prompt-label">Negative prompt</p>
                <div className="edit-prompt-box">
                  <textarea
                    className="edit-textarea edit-textarea-negative"
                    placeholder="What to avoid..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    disabled={loading}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Advanced controls */}
            <button
              className="edit-advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Sliders size={14} />
              {showAdvanced ? 'Hide' : 'Show'} advanced controls
            </button>

            {showAdvanced && (
              <div className="edit-advanced">
                <div className="edit-slider-row">
                  <label className="edit-slider-label">
                    Pose strength
                    <span>{poseStrength.toFixed(1)}</span>
                  </label>
                  <input
                    type="range" min="0.1" max="1.0" step="0.05"
                    value={poseStrength}
                    onChange={(e) => setPoseStrength(parseFloat(e.target.value))}
                    className="edit-slider"
                  />
                  <p className="edit-slider-hint">Higher = more pose change</p>
                </div>

                <div className="edit-slider-row">
                  <label className="edit-slider-label">
                    Structure strength
                    <span>{cannyStrength.toFixed(1)}</span>
                  </label>
                  <input
                    type="range" min="0.1" max="1.0" step="0.05"
                    value={cannyStrength}
                    onChange={(e) => setCannyStrength(parseFloat(e.target.value))}
                    className="edit-slider"
                  />
                  <p className="edit-slider-hint">Higher = preserve more structure</p>
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              className="edit-generate-btn"
              onClick={handleGenerate}
              disabled={!uploadedImage || !prompt.trim() || loading || credits < 2}
            >
              {loading ? (
                <><div className="edit-spinner" /> Editing...</>
              ) : (
                <><Send size={16} /> Generate Edit <Zap size={14} fill="currentColor" style={{marginLeft:4}} />2</>
              )}
            </button>
            {credits < 2 && (
              <p className="edit-credits-warn">Insufficient credits</p>
            )}
          </div>
        </div>

        {/* ── Right: Result ───────────────────────────────────────────── */}
        <div className="edit-right">
          <p className="edit-result-label">Result</p>

          {!loading && !image && !error && (
            <div className="edit-result-placeholder">
              <p>Your edited image will appear here</p>
            </div>
          )}

          {loading && (
            <div className="edit-result-loading">
              <PulseLoader />
              <p>Editing your image...</p>
            </div>
          )}

          {error && !loading && (
            <div className="edit-result-error">
              <AlertCircle size={28} color="#ff4444" />
              <p>{error}</p>
              <button className="edit-retry-btn" onClick={handleGenerate}>
                Try Again
              </button>
            </div>
          )}

          {image && !loading && !error && (
            <div
              className="edit-result-image"
              onClick={() => onViewImage({ url: image })}
              style={{ cursor: 'zoom-in' }}
            >
              <img src={image} alt="Edited result" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
