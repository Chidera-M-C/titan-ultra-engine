import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateUser = async (authUser) => {
    try {
      // Try to get existing user row
      const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Row doesn't exist — create it with 10 starter credits
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

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchOrCreateUser(currentUser);
        // Subscribe to realtime AFTER we have the user
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
      }

      setLoading(false);
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // Clean up old channel
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }

      if (currentUser) {
        await fetchOrCreateUser(currentUser);
        // Re-subscribe with new user
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

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, []); // Empty deps — runs once on mount only

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
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
