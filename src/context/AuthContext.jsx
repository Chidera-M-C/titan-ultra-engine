import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createAuthClient } from 'better-auth/react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext();

const authClient = createAuthClient({
  baseURL: "https://nudely.org",
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[AuthContext] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

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
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('credits, username, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCredits(data.credits ?? 0);
        setProfile({ username: data.username || '', avatar_url: data.avatar_url || '' });
        return;
      }

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ id: authUser.id, credits: 6, username: '', avatar_url: '' })
        .select('credits, username, avatar_url')
        .single();

      if (createError) throw createError;
      setCredits(newUser.credits ?? 0);
      setProfile({ username: newUser.username || '', avatar_url: newUser.avatar_url || '' });
    } catch (err) {
      console.error('Error fetching/creating user:', err.message);
    }
  };

  // Poll for session — retry a few times to handle the OAuth redirect race condition
  const checkSession = async (retries = 5, delayMs = 800) => {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await authClient.getSession();
        if (error) throw error;

        const currentUser = data?.user ?? data?.session?.user ?? null;

        if (currentUser) {
          if (currentUser.id !== initializedUserRef.current) {
            initializedUserRef.current = currentUser.id;
            setUser(currentUser);
            await fetchOrCreateUser(currentUser);
          }
          hideSplash();
          return;
        }
      } catch (err) {
        console.error(`Session check attempt ${i + 1} failed:`, err.message);
      }

      // Wait before retrying
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }

    // All retries exhausted — user is not logged in
    setUser(null);
    setCredits(0);
    setProfile({ username: '', avatar_url: '' });
    initializedUserRef.current = null;
    hideSplash();
  };

  useEffect(() => {
    checkSession();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",   // Return to root — no /dashboard route in this SPA
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
    <AuthContext.Provider value={{
      user, credits, profile, setProfile, setCredits,
      loginWithGoogle, signUpWithEmail, signInWithEmail, logout, loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
