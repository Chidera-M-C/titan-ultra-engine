import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Mail, Lock, LogIn } from 'lucide-react';
import './LoginModal.css';

const LoginModal = ({ isOpen, onClose }) => {
  const { loginWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login/Signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message);
      setIsRedirecting(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setIsRedirecting(true);
    setError('');
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        alert("Account created! You can now sign in.");
        setIsSignUp(false); // Switch back to login
      } else {
        await signInWithEmail(email, password);
        onClose(); // Close modal on success
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRedirecting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={isRedirecting ? null : onClose}>
      <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} disabled={isRedirecting}>&times;</button>
        
        <div className="login-content">
          <h2>{isSignUp ? "Create Account" : "Sign In"}</h2>
          <p className="promo-text">10 free credits for new accounts! 😊</p>

          {error && <div className="auth-error-message">{error}</div>}
          
          <form className="email-auth-form" onSubmit={handleEmailAuth}>
            <div className="input-group">
              <Mail size={18} />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="input-group">
              <Lock size={18} />
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
            <button className="email-submit-btn" disabled={isRedirecting}>
              {isRedirecting ? <Loader2 className="spinner-icon" /> : (isSignUp ? "Sign Up" : "Sign In")}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>
          
          <button 
            className={`google-signin-btn ${isRedirecting ? 'loading' : ''}`} 
            onClick={handleGoogleLogin}
            disabled={isRedirecting}
          >
            {isRedirecting ? <Loader2 className="spinner-icon" /> : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" />
                Continue with Google
              </>
            )}
          </button>

          <p className="toggle-auth-mode">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? "Sign In" : "Sign Up Free"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
