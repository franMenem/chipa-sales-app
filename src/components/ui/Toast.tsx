import { useToastStore } from '../../hooks/useToast';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-auto min-w-[300px] max-w-[90%] space-y-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message?: string;
  };
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const config = {
    success: {
      bg: 'bg-slate-800 dark:bg-[#1a2c20]',
      iconBg: 'bg-primary',
      iconColor: 'text-background-dark',
      icon: 'check',
      borderColor: 'border-primary/20',
    },
    error: {
      bg: 'bg-slate-800 dark:bg-[#2c1a1a]',
      iconBg: 'bg-red-500',
      iconColor: 'text-white',
      icon: 'error',
      borderColor: 'border-red-500/20',
    },
    warning: {
      bg: 'bg-slate-800 dark:bg-[#2c261a]',
      iconBg: 'bg-yellow-500',
      iconColor: 'text-white',
      icon: 'warning',
      borderColor: 'border-yellow-500/20',
    },
    info: {
      bg: 'bg-slate-800 dark:bg-[#1a1f2c]',
      iconBg: 'bg-blue-500',
      iconColor: 'text-white',
      icon: 'info',
      borderColor: 'border-blue-500/20',
    },
  };

  const style = config[toast.type];

  return (
    <div
      className={`flex items-center gap-3 ${style.bg} text-white px-4 py-3 rounded-full shadow-lg border ${style.borderColor} backdrop-blur-md animate-in slide-in-from-bottom duration-300`}
    >
      <div
        className={`flex shrink-0 items-center justify-center w-6 h-6 rounded-full ${style.iconBg} ${style.iconColor}`}
      >
        <span className="material-symbols-outlined text-[16px] font-bold">
          {style.icon}
        </span>
      </div>
      <div className="flex flex-col flex-1">
        <p className="text-sm font-medium leading-none">{toast.title}</p>
        {toast.message && (
          <p className="text-[10px] text-slate-300 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="flex shrink-0 items-center justify-center w-5 h-5 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Cerrar notificación"
      >
        <span className="material-symbols-outlined text-[14px]">close</span>
      </button>
    </div>
  );
}
