import React, { useState, useEffect } from 'react';
import './InstallPrompt.css';

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    const wasDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
    if (wasDismissed) return;

    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return;

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      // Show iOS manual instruction banner after a short delay
      setTimeout(() => setShow(true), 2000);
      return;
    }

    // Android/Chrome — catch the native install prompt
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!show) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-inner">
        <img src="/icons/icon-72x72.png" alt="Nudely" className="install-prompt-icon" />
        <div className="install-prompt-text">
          <p className="install-prompt-title">Add Nudely to Home Screen</p>
          {isIOS ? (
            <p className="install-prompt-sub">
              Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
            </p>
          ) : (
            <p className="install-prompt-sub">Install the app for the best experience</p>
          )}
        </div>
        <div className="install-prompt-actions">
          {!isIOS && (
            <button className="install-btn" onClick={handleInstall}>
              Install
            </button>
          )}
          <button className="install-dismiss" onClick={handleDismiss}>✕</button>
        </div>
      </div>
    </div>
  );
}
