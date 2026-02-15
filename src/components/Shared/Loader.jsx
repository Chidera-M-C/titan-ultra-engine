import './Shared.css';
import React from 'react';

export const Spinner = () => <div className="spinner"></div>;

export const PulseLoader = ({ message }) => (
  <div className="loading-state">
    <div className="pulse-loader"></div>
    {message && <p>{message}</p>}
  </div>
);
