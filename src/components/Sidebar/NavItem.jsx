import React from 'react';

export default function NavItem({ icon: Icon, label, isActive, onClick }) {
  return (
    <button 
      className={isActive ? 'active' : ''} 
      onClick={onClick}
    >
      <Icon size={20} /> 
      <span>{label}</span>
    </button>
  );
}
