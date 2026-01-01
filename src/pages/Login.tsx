import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, registerSchema, type LoginSchema, type RegisterSchema } from '../utils/validators';
import { ROUTES } from '../lib/constants';

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 mb-4">
            <span className="material-symbols-outlined text-primary text-4xl">
              bakery_dining
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Chipa Sales
          </h1>
          <p className="text-slate-700 dark:text-slate-300">
            Gestiona tu negocio de manera profesional
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-xl border border-slate-100 dark:border-slate-800">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                isLogin
                  ? 'bg-primary text-background-dark'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                !isLogin
                  ? 'bg-primary text-background-dark'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Forms */}
          {isLogin ? (
            <LoginForm signIn={signIn} loading={loading} onSuccess={() => navigate(ROUTES.DASHBOARD)} />
          ) : (
            <RegisterForm signUp={signUp} loading={loading} onSuccess={() => setMode('login')} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-700 dark:text-slate-300 mt-6">
          Gestión inteligente de costos y ventas
        </p>
      </div>
    </div>
  );
}

interface LoginFormProps {
  signIn: (email: string, password: string) => Promise<void>;
  loading: boolean;
  onSuccess: () => void;
}

function LoginForm({ signIn, loading, onSuccess }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchema) => {
    try {
      await signIn(data.email, data.password);
      onSuccess();
    } catch (error) {
      // Error handling is done in useAuth hook with toast
      console.error('Login error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          placeholder="tu@email.com"
          className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Contraseña
        </label>
        <input
          {...register('password')}
          type="password"
          placeholder="••••••••"
          className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {errors.password && (
          <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || loading}
        className="w-full py-3 px-4 bg-primary text-background-dark font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting || loading ? (
          <>
            <span className="material-symbols-outlined animate-spin">refresh</span>
            Iniciando...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">login</span>
            Iniciar Sesión
          </>
        )}
      </button>
    </form>
  );
}

interface RegisterFormProps {
  signUp: (email: string, password: string) => Promise<void>;
  loading: boolean;
  onSuccess: () => void;
}

function RegisterForm({ signUp, loading, onSuccess }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterSchema) => {
    try {
      await signUp(data.email, data.password);
      onSuccess();
    } catch (error) {
      // Error handling is done in useAuth hook with toast
      console.error('Register error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          placeholder="tu@email.com"
          className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Contraseña
        </label>
        <input
          {...register('password')}
          type="password"
          placeholder="••••••••"
          className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {errors.password && (
          <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Confirmar Contraseña
        </label>
        <input
          {...register('confirmPassword')}
          type="password"
          placeholder="••••••••"
          className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {errors.confirmPassword && (
          <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || loading}
        className="w-full py-3 px-4 bg-primary text-background-dark font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting || loading ? (
          <>
            <span className="material-symbols-outlined animate-spin">refresh</span>
            Registrando...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">person_add</span>
            Crear Cuenta
          </>
        )}
      </button>
    </form>
  );
}
