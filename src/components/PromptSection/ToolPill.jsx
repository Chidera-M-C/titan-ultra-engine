import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function ToolPill({ label, value, children, showIcon = false }) {
  return (
    <div className="tool-pill">
      <span className="pill-label">{label}</span>
      
      {/* If we pass a select dropdown, render it here */}
      {children}
      
      {/* If it's just a static value (like "Model v3.0") */}
      {value && <span>{value}</span>}
      
      {showIcon && <ChevronDown size={14} className="pill-icon" />}
    </div>
  );
}
