import React, { useRef, useEffect, useState } from 'react';
import { Send, ImagePlus, X } from 'lucide-react';
import AspectRatioDropdown from './AspectRatioDropdown';
import './PromptBox.css';

export default function PromptBox({
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  onGenerate,
  loading,
  collapsed = false,
  attachedImage,
  onImageAttach,
  onImageRemove,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    resize();
    textarea.style.scrollbarWidth = 'thin';
    textarea.style.scrollbarColor = '#2A2A2A #161616';
    textarea.addEventListener('input', resize);
    window.addEventListener('resize', resize);
    return () => {
      textarea.removeEventListener('input', resize);
      window.removeEventListener('resize', resize);
    };
  }, [prompt, collapsed]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (onImageAttach) onImageAttach(ev.target.result); // base64 string
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className={`prompt-container ${collapsed ? 'collapsed' : ''}`}>

      {/* Attached image preview strip */}
      {attachedImage && (
        <div className="prompt-image-preview">
          <img src={attachedImage} alt="Attached" className="prompt-image-thumb" />
          <button
            className="prompt-image-remove"
            onClick={onImageRemove}
            title="Remove image"
          >
            <X size={11} />
          </button>
          <span className="prompt-image-label">Edit mode</span>
        </div>
      )}

      <textarea
        ref={textareaRef}
        className="prompt-input"
        placeholder={
          attachedImage
            ? 'Describe the changes you want to make to the image...'
            : 'PLAIN WORDS DO NOT WORK! Use the PROMPTIMIZE feature on the left...⬅️'
        }
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={loading}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onGenerate();
          }
        }}
      />

      <div className="prompt-footer">
        <div className="left-tools">
          <AspectRatioDropdown
            value={aspectRatio}
            onChange={setAspectRatio}
          />

          {/* Image attach button */}
          <button
            className={`attach-image-btn ${attachedImage ? 'active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Attach image to edit"
          >
            <ImagePlus size={15} />
            <span>{attachedImage ? 'Change' : 'Edit Image'}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <button
          className="generate-fab"
          onClick={onGenerate}
          disabled={!prompt.trim() || loading}
        >
          {loading ? <div className="spinner"></div> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
}
