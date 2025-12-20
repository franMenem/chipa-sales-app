import { create } from 'zustand';
import type { ToastMessage } from '../lib/types';
import { TOAST_DURATION } from '../lib/constants';

interface ToastStore {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// Store de Zustand para gestionar toasts
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = crypto.randomUUID();
    const newToast: ToastMessage = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, TOAST_DURATION);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearAll: () => set({ toasts: [] }),
}));

// Hook helper para facilitar el uso de toasts
export function useToast() {
  const addToast = useToastStore((state) => state.addToast);

  return {
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),

    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),

    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),

    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
  };
}
