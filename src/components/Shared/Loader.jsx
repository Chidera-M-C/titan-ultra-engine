import React from 'react';

export const Spinner = () => <div className="spinner"></div>;

export const PulseLoader = ({ message = "Cooking your masterpiece..." }) => (
  <div className="loading-state">
    <div className="pulse-loader"></div>
    <p>{message}</p>
  </div>
);
