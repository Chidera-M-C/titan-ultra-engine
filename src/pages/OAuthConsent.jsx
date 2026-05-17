// src/pages/OAuthConsent.jsx
// NOTE: This page is only needed if you are building an OAuth *provider* (letting
// third-party apps log in WITH Nudely). If you're only using Google/email to log
// users INTO Nudely, you don't need this file at all — you can delete it.

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function OAuthConsent() {
  const { user, loginWithGoogle } = useAuth();
  const [authDetails, setAuthDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const authorizationId = new URLSearchParams(window.location.search).get('authorization_id');

  useEffect(() => {
    if (!authorizationId) {
      setError("Missing authorization_id in URL.");
      setLoading(false);
      return;
    }

    // If user isn't logged in, redirect to login via Better Auth (not Supabase)
    if (!user) {
      // Store where to return after login
      sessionStorage.setItem('oauth_return_url', window.location.href);
      loginWithGoogle(); // This redirects to Google, then back to callbackURL
      return;
    }

    // Fetch authorization details from YOUR backend
    // (Supabase never had a real supabase.auth.oauth.getAuthorizationDetails —
    //  that was an incorrect pattern. You need your own API endpoint for this.)
    fetch(`/api/oauth/authorization?authorization_id=${authorizationId}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setAuthDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load authorization details:', err);
        setError('Failed to load authorization details. Please try again.');
        setLoading(false);
      });
  }, [authorizationId, user]);

  const handleApprove = () => {
    window.location.href = `/api/oauth/decision?authorization_id=${authorizationId}&decision=approve`;
  };

  const handleDeny = () => {
    window.location.href = `/api/oauth/decision?authorization_id=${authorizationId}&decision=deny`;
  };

  if (loading) return <div style={{ padding: 40 }}>Loading consent details...</div>;
  if (error) return <div style={{ padding: 40, color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: 40, maxWidth: 500, margin: 'auto' }}>
      <h1>Authorize Access</h1>
      {authDetails && (
        <>
          <p>
            <strong>{authDetails.client?.name || 'An application'}</strong> wants
            to access your Nudely account.
          </p>
          <button
            onClick={handleApprove}
            style={{ background: 'green', color: 'white', padding: '12px 24px', marginRight: 12 }}
          >
            Approve
          </button>
          <button onClick={handleDeny}>Deny</button>
        </>
      )}
    </div>
  );
}
