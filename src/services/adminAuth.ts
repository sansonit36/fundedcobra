import { supabase } from '../lib/supabase';

export interface AdminSignInResponse {
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
  error: Error | null;
}

export const adminAuth = {
  async signIn(email: string, password: string): Promise<AdminSignInResponse> {
    try {
      // First sign in with email/password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      if (!authData.user) {
        throw new Error('No user returned from authentication');
      }

      // Then verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile || profile.role !== 'admin') {
        // Sign out if not admin
        await supabase.auth.signOut();
        throw new Error('Unauthorized: Admin access only');
      }

      return {
        user: {
          id: authData.user.id,
          email: authData.user.email!,
          role: profile.role
        },
        error: null
      };
    } catch (err) {
      // Sign out on any error
      await supabase.auth.signOut();
      console.error('Admin auth error:', err);
      return {
        user: null,
        error: err instanceof Error ? err : new Error('Failed to sign in')
      };
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentAdmin() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        return { user: null, error: sessionError || new Error('No active session') };
      }

      // Verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        return { user: null, error: new Error('Unauthorized: Admin access only') };
      }

      return {
        user: {
          id: session.user.id,
          email: session.user.email!,
          role: profile.role
        },
        error: null
      };
    } catch (err) {
      console.error('Get current admin error:', err);
      return {
        user: null,
        error: err instanceof Error ? err : new Error('Failed to get current admin')
      };
    }
  }
};