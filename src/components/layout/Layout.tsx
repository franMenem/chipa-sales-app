import type { ReactNode } from 'react';
import { AppBar } from './AppBar';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBottomNav?: boolean;
}

export function Layout({
  children,
  title,
  subtitle,
  showBottomNav = true,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white overflow-x-clip">
      {/* Sidebar for desktop */}
      {showBottomNav && <Sidebar />}

      {/* Main content area */}
      <div className="md:ml-64 min-h-screen flex flex-col">
        <AppBar title={title} subtitle={subtitle} />

        <main
          className="flex-1 pt-4 sm:pt-6 pb-18 sm:pb-20 md:pb-6 px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-[fadeIn_200ms_ease-out]"
          style={{
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
          }}
        >
          {children}
        </main>

        {/* Bottom navigation for mobile */}
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
