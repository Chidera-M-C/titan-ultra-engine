import React from 'react';

export default function NavItem({ icon: Icon, emoji, label, isActive, onClick }) {
  return (
    <button className={isActive ? 'active' : ''} onClick={onClick}>
      {emoji ? (
        <span className="nav-emoji">{emoji}</span>
      ) : Icon ? (
        <Icon size={17} />
      ) : null}
      {label}
    </button>
  );
}
