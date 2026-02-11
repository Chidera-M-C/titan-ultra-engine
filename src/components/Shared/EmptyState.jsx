import React from 'react';

export default function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {Icon && <Icon size={32} />}
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
