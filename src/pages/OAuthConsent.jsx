// src/pages/OAuthConsent.jsx  (or in your router)
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function OAuthConsent() {
  const { user } = useAuth();
  const [authDetails, setAuthDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const authorizationId = new URLSearchParams(window.location.search).get('authorization_id');

  useEffect(() => {
    if (!authorizationId) {
      alert("Missing authorization_id");
      return;
    }

    const loadDetails = async () => {
      if (!user) {
        // Redirect to login first
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.href }
        });
        return;
      }

      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (error) console.error(error);
      setAuthDetails(data);
      setLoading(false);
    };

    loadDetails();
  }, [authorizationId, user]);

  const handleApprove = async () => {
    // Call your backend or use Supabase helper to approve
    window.location.href = `/api/oauth/decision?authorization_id=${authorizationId}&decision=approve`;
  };

  const handleDeny = () => {
    window.location.href = `/api/oauth/decision?authorization_id=${authorizationId}&decision=deny`;
  };

  if (loading) return <div>Loading consent...</div>;

  return (
    <div style={{ padding: 40, maxWidth: 500, margin: 'auto' }}>
      <h1>Authorize Access</h1>
      {authDetails && (
        <>
          <p><strong>{authDetails.client?.name}</strong> wants to access your Nudely account.</p>
          <button onClick={handleApprove} style={{ background: 'green', color: 'white', padding: '12px 24px', marginRight: 12 }}>
            Approve
          </button>
          <button onClick={handleDeny}>Deny</button>
        </>
      )}
    </div>
  );
}
