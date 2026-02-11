import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function ToolPill({ label, value, children }) {
  return (
    <div className="tool-pill">
      <span className="pill-label">{label}</span>
      {value && <span className="pill-value">{value}</span>}
      {children} {/* This is where the hidden <select> lives */}
      <ChevronDown size={12} className="pill-icon" />
    </div>
  );
}
