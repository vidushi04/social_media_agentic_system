import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// When Supabase isn't configured (local dev without a project set up), `supabase`
// stays null and every caller must check `isSupabaseConfigured` first — this keeps
// the app usable in local/localStorage-only mode without a live project.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export interface Profile {
  user_id: string;
  email: string;
  youtube_username: string | null;
  youtube_username_confirmed: boolean;
  access_status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  created_at: string;
}

export type AccessStatus = Profile['access_status'];
