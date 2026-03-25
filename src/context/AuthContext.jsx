import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const initializedUserRef    = useRef(null);
  const [profile, setProfile] = useState({ username: '', avatar_url: '' });

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
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ id: authUser.id, credits: 6 })
          .select('credits, username, avatar_url')
          .single();
        if (createError) throw createError;
        if (newUser) {
          setCredits(newUser.credits);
          setProfile({ username: newUser.username || '', avatar_url: newUser.avatar_url || '' });
        }
      } else if (data) {
        setCredits(data.credits);
        setProfile({ username: data.username || '', avatar_url: data.avatar_url || '' }); // ✅ move this here
      }

  useEffect(() => {
    let realtimeChannel = null;

    // ── Safety timeout — never stay stuck on splash forever ──────────
    const safetyTimeout = setTimeout(() => {
      console.warn('Auth safety timeout fired — forcing splash hide');
      hideSplash();
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.id);
        const currentUser = session?.user ?? null;

        // Ignore duplicate SIGNED_IN for the same user
        if (event === 'SIGNED_IN' && currentUser?.id === initializedUserRef.current) {
          console.log('Auth event: duplicate SIGNED_IN ignored');
          return;
        }

        setUser(currentUser);

        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }

        if (currentUser) {
          initializedUserRef.current = currentUser.id;

          // Fire and forget — never block loading on DB call
          fetchOrCreateUser(currentUser);

          realtimeChannel = supabase
            .channel(`credits-${currentUser.id}`)
            .on(
              'postgres_changes',
              {
                event:  'UPDATE',
                schema: 'public',
                table:  'users',
                filter: `id=eq.${currentUser.id}`
              },
              (payload) => {
                console.log('💳 Credits updated via realtime:', payload.new.credits);
                setCredits(payload.new.credits);
              }
            )
            .subscribe();
        } else {
          initializedUserRef.current = null;
          setCredits(0);
        }

        if (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN'       ||
          event === 'SIGNED_OUT'
        ) {
          clearTimeout(safetyTimeout);
          hideSplash();
        }
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt:      'select_account',
            access_type: 'offline',
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Login failed:', error.message);
    }
  };

  const signUpWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Signup error:', error.message);
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setCredits(0);
      initializedUserRef.current = null;
    } catch (error) {
      console.error('Logout failed:', error.message);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      credits,
      setCredits,
      profile,
      setProfile,
      loginWithGoogle,
      signUpWithEmail,
      signInWithEmail,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
