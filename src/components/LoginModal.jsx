import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Mail, Lock, X } from 'lucide-react';
import './LoginModal.css';

const LoginModal = ({ isOpen, onClose }) => {
  const { loginWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
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
      setError("Google sign-in failed. Try again.");
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
        alert("Verification email sent! Check your inbox.");
        setIsSignUp(false);
      } else {
        await signInWithEmail(email, password);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRedirecting(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={isRedirecting ? null : onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} disabled={isRedirecting}>
          <X size={20} />
        </button>
        
        <div className="auth-header">
          <div className="auth-logo-glow" />
          <h2>{isSignUp ? "Create Account" : "Welcome Back"}</h2>
          <p>Get 10 free credits to start creating ✨</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        
        <form className="auth-form" onSubmit={handleEmailAuth}>
          <div className="auth-input-wrapper">
            <Mail size={18} className="auth-icon" />
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="auth-input-wrapper">
            <Lock size={18} className="auth-icon" />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button className="auth-primary-btn" disabled={isRedirecting}>
            {isRedirecting ? <Loader2 className="auth-spin" /> : (isSignUp ? "Sign Up" : "Sign In")}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>
        
        <button 
          className="auth-google-btn" 
          onClick={handleGoogleLogin}
          disabled={isRedirecting}
        >
          {isRedirecting ? <Loader2 className="auth-spin" /> : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
              Continue with Google
            </>
          )}
        </button>

        <p className="auth-footer">
          {isSignUp ? "Already have an account?" : "New here?"}
          <button onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Log In" : "Sign Up Free"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
