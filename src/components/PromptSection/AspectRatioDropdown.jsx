import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './AspectRatioDropdown.css';

const RatioIcon = ({ ratio }) => {
  switch (ratio) {
    case '1:1':
      return <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0 }}><rect width="12" height="12" rx="1" fill="currentColor" /></svg>;
    case '4:5':
      return <svg width="10" height="12" viewBox="0 0 10 12" style={{ flexShrink: 0 }}><rect width="10" height="12" rx="1" fill="currentColor" /></svg>;
    case '9:16':
      return <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0 }}><rect width="8" height="14" rx="1" fill="currentColor" /></svg>;
    case '16:9':
      return <svg width="14" height="8" viewBox="0 0 14 8" style={{ flexShrink: 0 }}><rect width="14" height="8" rx="1" fill="currentColor" /></svg>;
    default:
      return <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0 }}><rect width="12" height="12" rx="1" fill="currentColor" /></svg>;
  }
};

const RATIOS = [
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' }
];

export default function AspectRatioDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (ratio) => {
    onChange(ratio);
    setIsOpen(false);
  };

  return (
    <div className="aspect-dropdown" ref={dropdownRef}>
      <div
        className="aspect-pill"
        onClick={() => setIsOpen(!isOpen)}
      >
        <RatioIcon ratio={value} />
        <span className="aspect-value">{value}</span>
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </div>

      {isOpen && (
        <div className="aspect-dropdown-menu">
          {RATIOS.map((ratio) => (
            <div
              key={ratio.value}
              className={`aspect-dropdown-item ${value === ratio.value ? 'active' : ''}`}
              onClick={() => handleSelect(ratio.value)}
            >
              <span>{ratio.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
