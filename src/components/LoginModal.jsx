import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import './LoginModal.css';

const LoginModal = ({ isOpen, onClose }) => {
  const { loginWithGoogle } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    if (isRedirecting) return;
    
    setIsRedirecting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Login failed:", err);
      setIsRedirecting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={isRedirecting ? null : onClose}>
      <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
        <button 
          className="close-button" 
          onClick={onClose}
          disabled={isRedirecting}
        >
          &times;
        </button>
        
        <div className="login-content">
          <h2>Sign in to generate your own image</h2>
          <p className="promo-text">First time? 10 free credits on us! 😊</p>
          
          <button 
            className={`google-signin-btn ${isRedirecting ? 'loading' : ''}`} 
            onClick={handleGoogleLogin}
            disabled={isRedirecting}
          >
            {isRedirecting ? (
              <Loader2 className="spinner-icon" size={20} />
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                Continue with Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
