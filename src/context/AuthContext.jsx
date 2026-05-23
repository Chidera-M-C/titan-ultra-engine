import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createAuthClient } from 'better-auth/react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext();

const authClient = createAuthClient({
  baseURL: "https://nudely.org",
  basePath: "/api/auth",
  fetchOptions: { credentials: "include" },
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  const realtimeChannelRef = useRef(null);

  const hideSplash = () => {
    setLoading(false);
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 500);
    }
  };

  const subscribeToCredits = (userId) => {
    if (!supabase) return;
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }
    realtimeChannelRef.current = supabase
      .channel(`credits-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user',           // now "user" not "users"
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          setCredits(payload.new.credits ?? 0);
          setProfile((prev) => ({
            ...prev,
            username: payload.new.username || prev.username,
            avatar_url: payload.new.avatar_url || prev.avatar_url,
          }));
        }
      )
      .subscribe();
  };

  const fetchOrInitUser = async (authUser) => {
    try {
      // Call server function which reads/writes the "user" table with service role
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits ?? 6);
        setProfile({
          username: data.username || '',
          avatar_url: data.avatar_url || '',
        });
      } else {
        console.error('create-user failed:', await res.text());
        setCredits(0);
      }
    } catch (err) {
      console.error('fetchOrInitUser error:', err.message);
    }
  };

  const initUser = async (authUser) => {
    initializedUserRef.current = authUser.id;
    setUser(authUser);
    await fetchOrInitUser(authUser);
    subscribeToCredits(authUser.id);
  };

  const clearUser = () => {
    setUser(null);
    setCredits(0);
    setProfile({ username: '', avatar_url: '' });
    initializedUserRef.current = null;
    if (supabase && realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  };

  const checkSession = async (retries = 5, delayMs = 800) => {
    const safetyTimeout = setTimeout(() => {
      console.warn('Auth safety timeout — forcing splash hide');
      hideSplash();
    }, 8000);

    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await authClient.getSession();
        if (error) throw error;

        const currentUser = data?.user ?? data?.session?.user ?? null;

        if (currentUser) {
          if (currentUser.id !== initializedUserRef.current) {
            await initUser(currentUser);
          }
          clearTimeout(safetyTimeout);
          hideSplash();
          return;
        }
      } catch (err) {
        console.error(`Session check attempt ${i + 1} failed:`, err.message);
      }

      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }

    clearTimeout(safetyTimeout);
    clearUser();
    hideSplash();
  };

  useEffect(() => {
    checkSession();
    return () => {
      if (supabase && realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
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
      if (data?.user) await initUser(data.user);
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
      if (data?.user) await initUser(data.user);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authClient.signOut();
      clearUser();
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
