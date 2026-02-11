import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Get the current authenticated user.
 * Throws if no user is authenticated.
 */
export async function getCurrentUser(): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');
  return user;
}
