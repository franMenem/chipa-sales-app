import type { ReactNode } from 'react';
import { ThemeToggle } from '../ui/ThemeToggle';

interface AppBarProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function AppBar({ title, subtitle, action }: AppBarProps) {
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
          {action}
        </div>
      </div>
    </div>
  );
}
