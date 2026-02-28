import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateUser = async (authUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ id: authUser.id, credits: 10 })
          .select('credits')
          .single();
        if (createError) throw createError;
        if (newUser) setCredits(newUser.credits);
      } else if (error) {
        throw error;
      } else if (data) {
        setCredits(data.credits);
      }
    } catch (err) {
      console.error("Error fetching/creating user:", err.message);
    }
  };

  useEffect(() => {
    let realtimeChannel = null;

    // CRITICAL: onAuthStateChange fires immediately with the
    // current session on mount — this is the correct way to
    // restore session on page reload with Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.id);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }

        if (currentUser) {
          await fetchOrCreateUser(currentUser);

          realtimeChannel = supabase
            .channel(`credits-${currentUser.id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${currentUser.id}`
              },
              (payload) => {
                setCredits(payload.new.credits);
              }
            )
            .subscribe();
        } else {
          setCredits(0);
        }

        // Only set loading false after INITIAL_SESSION event
        // so we don't flash the login modal before session restores
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );

    return () => {
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
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Login failed:", error.message);
    }
  };

  const signUpWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Signup error:", error.message);
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Login error:", error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setCredits(0);
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      credits,
      loginWithGoogle,
      signUpWithEmail,
      signInWithEmail,
      logout,
      loading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
