import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });
  const toast = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('¡Bienvenido!', 'Sesión iniciada correctamente');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al iniciar sesión';
      toast.error('Error de autenticación', message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      toast.success(
        '¡Registro exitoso!',
        'Revisa tu email para confirmar tu cuenta'
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al registrarse';
      toast.error('Error de registro', message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      toast.info('Sesión cerrada', 'Hasta pronto');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al cerrar sesión';
      toast.error('Error', message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success(
        'Email enviado',
        'Revisa tu correo para restablecer tu contraseña'
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al enviar email';
      toast.error('Error', message);
      throw error;
    }
  };

  return {
    session: authState.session,
    user: authState.user,
    loading: authState.loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}
