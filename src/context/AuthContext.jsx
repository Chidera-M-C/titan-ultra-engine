import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createAuthClient } from 'better-auth/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [profile, setProfile] = useState({ username: '', avatar_url: '' });
  const [loading, setLoading] = useState(true);
  const initializedUserRef = useRef(null);

  // Better Auth Client
  const authClient = createAuthClient({
    baseURL: "https://nudely.org",   // Change to your domain
    basePath: "/api/auth",
  });

  const hideSplash = () => {
    setLoading(false);
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 500);
    }
  };

  const fetchOrCreateUser = async (authUser) => {
    // Keep using Supabase for your custom users table
    try {
      const { data, error } = await supabase
        .from('users')
        .select('credits, username, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCredits(data.credits ?? 0);
        setProfile({
          username: data.username || '',
          avatar_url: data.avatar_url || '',
        });
        return;
      }

      // New user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          credits: 6,
          username: '',
          avatar_url: '',
        })
        .select('credits, username, avatar_url')
        .single();

      if (createError) throw createError;

      setCredits(newUser.credits ?? 0);
      setProfile({
        username: newUser.username || '',
        avatar_url: newUser.avatar_url || '',
      });
    } catch (err) {
      console.error('Error fetching/creating user:', err.message);
    }
  };

  useEffect(() => {
    const unsubscribe = authClient.onSessionChange(async (session) => {
      const currentUser = session?.user ?? null;

      if (currentUser?.id === initializedUserRef.current) return;

      setUser(currentUser);

      if (currentUser) {
        initializedUserRef.current = currentUser.id;
        fetchOrCreateUser(currentUser);
      } else {
        initializedUserRef.current = null;
        setCredits(0);
        setProfile({ username: '', avatar_url: '' });
      }

      hideSplash();
    });

    // Initial session check
    authClient.getSession().then(({ data }) => {
      if (data.session) {
        setUser(data.session.user);
        fetchOrCreateUser(data.session.user);
      }
      hideSplash();
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",   // Change to your desired redirect page
      });
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  const signUpWithEmail = async (email, password) => {
    try {
      const { data, error } = await authClient.signUp.email({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await authClient.signIn.email({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authClient.signOut();
      setUser(null);
      setCredits(0);
      setProfile({ username: '', avatar_url: '' });
      initializedUserRef.current = null;
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        credits,
        profile,
        setProfile,
        setCredits,
        loginWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
