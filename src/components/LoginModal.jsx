import React from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginModal.css';

const LoginModal = ({ isOpen, onClose }) => {
  const { loginWithGoogle } = useAuth();

  if (!isOpen) return null;

  return (
    /* Clicking the overlay will now correctly trigger onClose 
       because App.jsx recognizes 'modal-overlay' as an exception */
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="login-modal-card" // Updated class to match App.jsx guard
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="close-button" // Updated class to match App.jsx guard
          onClick={onClose}
        >
          &times;
        </button>
        
        <div className="login-content">
          <h2>Sign in to generate your own image</h2>
          <p className="promo-text">10 free credits on us! 😊</p>
          
          <button className="google-signin-btn" onClick={loginWithGoogle}>
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
            />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
