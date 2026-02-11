import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

interface AppBarProps {
  title: string;
  subtitle?: string;
}

export function AppBar({ title, subtitle }: AppBarProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Sesión cerrada', 'Has cerrado sesión correctamente');
      navigate('/login');
    } catch (error) {
      toast.error('Error al cerrar sesión', 'Intenta nuevamente');
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
      <div
        className="flex items-center px-4 md:px-6 lg:px-8 py-3 justify-between max-w-7xl mx-auto w-full"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        }}
      >
        <div className="flex flex-col flex-1 min-w-0">
          {subtitle && (
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {subtitle}
            </p>
          )}
          <h2 className="text-xl md:text-xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
        </div>
        <div className="flex items-center justify-end gap-1 shrink-0">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg transition-all active:scale-95 hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ touchAction: 'manipulation' }}
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
              logout
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
