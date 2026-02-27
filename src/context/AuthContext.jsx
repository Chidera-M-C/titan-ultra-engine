import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0); // Added credits state
  const [loading, setLoading] = useState(true);

  // Function to fetch credits from the public.users table
  const fetchCredits = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) setCredits(data.credits);
    } catch (err) {
      console.error("Error fetching credits:", err.message);
    }
  };

  useEffect(() => {
    // 1. Check active sessions on mount
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchCredits(currentUser.id);
      }
      setLoading(false);
    };

    initializeAuth();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchCredits(currentUser.id);
      } else {
        setCredits(0);
      }
      setLoading(false);
    });

    // 3. Listen for REAL-TIME credit updates (Topping up/Deductions)
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        (payload) => {
          if (user && payload.new.id === user.id) {
            setCredits(payload.new.credits);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Login failed:", error.message);
    }
  };

  // NEW: Email Signup
  const signUpWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Signup error:", error.message);
      throw error;
    }
  };

  // NEW: Email Login
  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
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
