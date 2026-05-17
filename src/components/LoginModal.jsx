import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Mail, Lock, X } from 'lucide-react';
import './LoginModal.css';

const LoginModal = ({ isOpen, onClose }) => {
  const { loginWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // If the user lands back on this page after a failed OAuth redirect,
  // check for an error param in the URL and surface it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (oauthError) {
      setError(`Sign-in failed: ${oauthError}. Please try again.`);
      // Clean the URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    if (googleLoading || emailLoading) return;
    setError('');
    setGoogleLoading(true);
    try {
      // loginWithGoogle() will redirect the browser to Google.
      // The spinner stays visible until the page navigates away — this is correct.
      // If it throws before redirecting, we catch it below.
      await loginWithGoogle();
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(err?.message || "Google sign-in failed. Check your internet connection and try again.");
      setGoogleLoading(false);
    }
    // Note: do NOT reset googleLoading in a finally block.
    // If redirect succeeded, the page is gone. If it failed, catch above resets it.
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (emailLoading || googleLoading) return;
    setEmailLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setSuccessMsg("Account created! Check your inbox for a verification email.");
        setEmail('');
        setPassword('');
        setIsSignUp(false);
      } else {
        await signInWithEmail(email, password);
        onClose();
      }
    } catch (err) {
      console.error('Email auth error:', err);
      // Better Auth returns structured errors — surface them clearly
      const msg = err?.message || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const isAnyLoading = googleLoading || emailLoading;

  return (
    <div className="auth-overlay" onClick={isAnyLoading ? null : onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} disabled={isAnyLoading}>
          <X size={20} />
        </button>

        <div className="auth-header">
          <div className="auth-logo-glow" />
          <h2>{isSignUp ? "Create Account" : "Welcome Back"}</h2>
          <p>Get 10 free credits to start creating ✨</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {successMsg && <div className="auth-success">{successMsg}</div>}

        <form className="auth-form" onSubmit={handleEmailAuth}>
          <div className="auth-input-wrapper">
            <Mail size={18} className="auth-icon" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isAnyLoading}
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
              disabled={isAnyLoading}
            />
          </div>
          <button className="auth-primary-btn" type="submit" disabled={isAnyLoading}>
            {emailLoading
              ? <Loader2 className="auth-spin" size={18} />
              : (isSignUp ? "Sign Up" : "Sign In")}
          </button>
        </form>

        <div className="auth-divider"><span>OR</span></div>

        <button
          className="auth-google-btn"
          onClick={handleGoogleLogin}
          disabled={isAnyLoading}
          type="button"
        >
          {googleLoading
            ? <Loader2 className="auth-spin" size={18} />
            : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
                Continue with Google
              </>
            )}
        </button>

        {googleLoading && (
          <p className="auth-redirect-note">
            Redirecting to Google… this page will navigate away.
          </p>
        )}

        <p className="auth-footer">
          {isSignUp ? "Already have an account?" : "New here?"}
          <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMsg(''); }}>
            {isSignUp ? "Log In" : "Sign Up Free"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
