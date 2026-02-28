import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0); 
  const [loading, setLoading] = useState(true);

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
    let channel;

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchCredits(currentUser.id);
        // Start Realtime only after we have a user
        channel = supabase
          .channel(`user-changes-${currentUser.id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${currentUser.id}` },
            (payload) => setCredits(payload.new.credits)
          )
          .subscribe();
      }
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchCredits(currentUser.id);
      } else {
        setCredits(0);
        if (channel) supabase.removeChannel(channel);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array to prevent re-subscription loops

  const loginWithGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account', access_type: 'offline' },
        },
      });
    } catch (error) {
      console.error("Login failed:", error.message);
    }
  };

  const signUpWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCredits(0);
  };

  return (
    <AuthContext.Provider value={{ user, credits, loginWithGoogle, signUpWithEmail, signInWithEmail, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
