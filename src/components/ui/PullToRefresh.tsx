import type { ReactNode } from 'react';
import { usePullToRefresh } from '../../hooks/domain/usePullToRefresh';
import { PullRefreshIndicator } from './PullRefreshIndicator';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper que agrega pull-to-refresh a cualquier página.
 * El gesto funciona cuando window.scrollY === 0 y el usuario arrastra hacia abajo.
 *
 * Uso:
 *   <PullToRefresh onRefresh={handleRefresh}>
 *     {content}
 *   </PullToRefresh>
 */
export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const { isPulling, isRefreshing, pullProgress } = usePullToRefresh(onRefresh);

  return (
    <>
      <PullRefreshIndicator
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        progress={pullProgress}
      />
      <div className={className}>{children}</div>
    </>
  );
}
