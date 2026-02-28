import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  role: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({} as AdminAuthContextType);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      if (!session?.user) {
        setAdmin(null);
        setLoading(false);
        return;
      }

      // Get user profile with role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Check if user is admin and active
      if (profile?.role === 'admin' && profile?.status === 'active') {
        setAdmin({
          id: session.user.id,
          email: session.user.email!,
          role: profile.role
        });
      } else {
        setAdmin(null);
      }
    } catch (err) {
      console.error('Admin check error:', err);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      if (!data.user) throw new Error('No user returned');

      // Verify admin role and status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile || profile.role !== 'admin' || profile.status !== 'active') {
        throw new Error('Unauthorized: Admin access only');
      }

      setAdmin({
        id: data.user.id,
        email: data.user.email!,
        role: profile.role
      });

      return { error: null };
    } catch (err) {
      console.error('Sign in error:', err);
      setAdmin(null);
      return { error: err instanceof Error ? err : new Error('Failed to sign in') };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setAdmin(null);
      setError(null);
    } catch (err) {
      console.error('Sign out error:', err);
      throw err;
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        error,
        signIn,
        signOut
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}