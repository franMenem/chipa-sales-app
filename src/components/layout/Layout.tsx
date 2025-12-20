import type { ReactNode } from 'react';
import { AppBar } from './AppBar';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  showBottomNav?: boolean;
}

export function Layout({
  children,
  title,
  subtitle,
  headerAction,
  showBottomNav = true,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        <AppBar title={title} subtitle={subtitle} action={headerAction} />

        <main className="flex-1 pb-24">
          {children}
        </main>

        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
