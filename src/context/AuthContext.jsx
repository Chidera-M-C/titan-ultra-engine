import React, { createContext, useContext, useEffect, useState } from 'react';
import { account } from '../lib/appwrite';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const sessionUser = await account.get();
      setUser(sessionUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => {
    // Force the redirect to your production URL if you are testing the live site
    // Or keep it dynamic but ENSURE both are in Google Cloud Console
    const redirectUrl = window.location.origin; 

    account.createOAuth2Session(
      'google',
      redirectUrl, 
      `${redirectUrl}/login` 
    );
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
