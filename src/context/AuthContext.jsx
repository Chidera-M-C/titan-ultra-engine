import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [profile, setProfile] = useState({
    username: '',
    avatar_url: '',
  });
  const [loading, setLoading] = useState(true);
  const initializedUserRef = useRef(null);

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

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          credits: 10,
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
    let realtimeChannel = null;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.id);
      const currentUser = session?.user ?? null;

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
        await fetchOrCreateUser(currentUser);

        realtimeChannel = supabase
          .channel(`credits-${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'users',
              filter: `id=eq.${currentUser.id}`,
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
      } else {
        initializedUserRef.current = null;
        setCredits(0);
        setProfile({
          username: '',
          avatar_url: '',
        });
      }

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT'
      ) {
        setLoading(false);
      }
    });

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
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
      setProfile({
        username: '',
        avatar_url: '',
      });
      initializedUserRef.current = null;
    } catch (error) {
      console.error('Logout failed:', error.message);
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
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
