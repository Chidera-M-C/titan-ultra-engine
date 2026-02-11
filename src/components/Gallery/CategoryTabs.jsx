import './Gallery.css';
import React from 'react';

export default function CategoryTabs({ categories, activeCategory, onSelectCategory }) {
  return (
    <div className="category-tabs">
      {categories.map((cat) => (
        <span 
          key={cat} 
          className={`tab ${activeCategory === cat ? 'active' : ''}`} 
          onClick={() => onSelectCategory(cat)}
        >
          {cat}
        </span>
      ))}
    </div>
  );
}
