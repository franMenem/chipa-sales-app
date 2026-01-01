import type { ReactNode } from 'react';
import { AppBar } from './AppBar';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

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
      {/* Sidebar for desktop */}
      {showBottomNav && <Sidebar />}

      {/* Main content area */}
      <div className="md:ml-64 min-h-screen flex flex-col">
        <AppBar title={title} subtitle={subtitle} action={headerAction} />

        <main className="flex-1 pb-24 md:pb-6 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Bottom navigation for mobile */}
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
