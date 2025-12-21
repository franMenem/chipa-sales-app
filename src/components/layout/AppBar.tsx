import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../ui/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';

interface AppBarProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function AppBar({ title, subtitle, action }: AppBarProps) {
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Sesión cerrada', 'Has cerrado sesión correctamente');
      navigate('/login');
    } catch (error) {
      toast.error('Error al cerrar sesión', 'Intenta nuevamente');
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800/50">
      <div className="flex items-center p-4 pb-2 justify-between">
        <div className="flex flex-col flex-1 min-w-0">
          {subtitle && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
          <h2 className="text-xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
        </div>
        <div className="flex items-center justify-end gap-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
              logout
            </span>
          </button>
          {action}
        </div>
      </div>
    </div>
  );
}
