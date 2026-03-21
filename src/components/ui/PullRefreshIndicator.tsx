interface PullRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  progress: number; // 0-1
}

const HIDDEN_Y = -56;   // px — completamente fuera del viewport
const VISIBLE_Y = 72;   // px desde top — justo bajo el AppBar (~64px)

/**
 * Indicador visual de pull-to-refresh.
 * Posicionado fixed para que nunca quede clippeado por el layout.
 */
export function PullRefreshIndicator({ isPulling, isRefreshing, progress }: PullRefreshIndicatorProps) {
  const isVisible = isPulling || isRefreshing;

  if (!isVisible) return null;

  const translateY = isRefreshing
    ? VISIBLE_Y
    : HIDDEN_Y + (VISIBLE_Y - HIDDEN_Y) * progress;

  const isComplete = progress >= 1;

  return (
    <div
      className="fixed left-1/2 z-40 pointer-events-none"
      style={{
        top: 0,
        transform: `translateX(-50%) translateY(${translateY}px)`,
        transition: isRefreshing ? 'transform 200ms ease-out' : undefined,
      }}
    >
      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center">
        {isRefreshing ? (
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        ) : (
          <span
            className="material-symbols-outlined text-primary text-xl transition-transform duration-150"
            style={{ transform: `rotate(${isComplete ? 180 : 0}deg)` }}
          >
            arrow_downward
          </span>
        )}
      </div>
    </div>
  );
}
