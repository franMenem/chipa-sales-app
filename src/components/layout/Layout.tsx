import type { ReactNode } from 'react';
import { AppBar } from './AppBar';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed';

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
  const { isCollapsed, toggle } = useSidebarCollapsed();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white overflow-x-clip">
      {/* Sidebar for desktop */}
      {showBottomNav && <Sidebar isCollapsed={isCollapsed} onToggle={toggle} />}

      {/* Main content area */}
      <div
        className={`min-h-screen flex flex-col transition-all duration-200 ${
          showBottomNav ? (isCollapsed ? 'md:ml-14' : 'md:ml-64') : ''
        }`}
      >
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
