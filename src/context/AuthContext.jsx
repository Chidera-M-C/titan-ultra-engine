import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createAuthClient } from 'better-auth/react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext();

// Better Auth Client — handles sessions, sign-in, sign-up
const authClient = createAuthClient({
  baseURL: "https://nudely.org",
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
});

// Supabase client — ONLY for reading/writing your custom `users` table
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [profile, setProfile] = useState({ username: '', avatar_url: '' });
  const [loading, setLoading] = useState(true);
  const initializedUserRef = useRef(null);

  const hideSplash = () => {
    setLoading(false);
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 500);
    }
  };

  const fetchOrCreateUser = async (authUser) => {
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

      // New user — insert with starter credits
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
    // Better Auth: poll the session on mount
    authClient.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Session fetch error:', error);
        hideSplash();
        return;
      }

      const currentUser = data?.session?.user ?? null;

      if (currentUser && currentUser.id !== initializedUserRef.current) {
        initializedUserRef.current = currentUser.id;
        setUser(currentUser);
        fetchOrCreateUser(currentUser);
      } else if (!currentUser) {
        setUser(null);
        setCredits(0);
        setProfile({ username: '', avatar_url: '' });
        initializedUserRef.current = null;
      }

      hideSplash();
    });
  }, []);

  const loginWithGoogle = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email, password) => {
    try {
      const { data, error } = await authClient.signUp.email({ email, password });
      if (error) throw error;
      // After sign-up, fetch/create user record
      if (data?.user) {
        setUser(data.user);
        initializedUserRef.current = data.user.id;
        await fetchOrCreateUser(data.user);
      }
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
      if (data?.user) {
        setUser(data.user);
        initializedUserRef.current = data.user.id;
        await fetchOrCreateUser(data.user);
      }
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
