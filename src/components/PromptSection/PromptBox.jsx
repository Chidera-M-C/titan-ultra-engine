import React from 'react';
import { Send } from 'lucide-react';
import ToolPill from './ToolPill';
import './PromptBox.css';

export default function PromptBox({ 
  prompt, 
  setPrompt, 
  aspectRatio, 
  setAspectRatio, 
  onGenerate, 
  loading,
  collapsed = false 
}) {
  
  return (
    <div className={`prompt-container ${collapsed ? 'collapsed' : ''}`}>
      <textarea
        className="prompt-input"
        placeholder={collapsed ? "Describe what you want to see..." : "Generate new or upload & edit..."}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={collapsed ? 1 : 3}
        disabled={loading}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onGenerate();
          }
        }}
      />
      
      {/* Show tools only when expanded */}
      {!collapsed && (
        <div className="prompt-tools">
          <div className="left-tools">
            <ToolPill label="ASPECT RATIO" value={aspectRatio}>
              <select 
                className="hidden-select" 
                value={aspectRatio} 
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="1:1">1:1 Square</option>
                <option value="2:3">2:3 Portrait</option>
                <option value="3:2">3:2 Landscape</option>
                <option value="4:5">4:5 Tall</option>
                <option value="16:9">16:9 Wide</option>
              </select>
            </ToolPill>
            
            <ToolPill label="MODEL" value="v3.0" />
          </div>
          
          <button 
            className="generate-fab" 
            onClick={onGenerate} 
            disabled={!prompt.trim() || loading}
            title="Generate"
          >
            {loading ? <div className="spinner"></div> : <Send size={20} />}
          </button>
        </div>
      )}

      {/* Show send button when collapsed */}
      {collapsed && (
        <button 
          className="generate-fab collapsed-send" 
          onClick={onGenerate} 
          disabled={!prompt.trim() || loading}
          title="Generate"
        >
          {loading ? <div className="spinner"></div> : <Send size={20} />}
        </button>
      )}
    </div>
  );
}
