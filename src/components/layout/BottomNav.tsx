import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';

const primaryItems = [
  { path: ROUTES.DASHBOARD, icon: 'dashboard', label: 'Inicio', filled: true },
  { path: ROUTES.PRODUCTOS, icon: 'bakery_dining', label: 'Recetas' },
  { path: ROUTES.STOCK, icon: 'warehouse', label: 'Stock' },
  { path: ROUTES.VENTAS, icon: 'receipt_long', label: 'Ventas' },
];

const moreItems = [
  { path: ROUTES.INSUMOS, icon: 'inventory_2', label: 'Insumos' },
  { path: ROUTES.COSTOS_FIJOS, icon: 'payments', label: 'Costos Fijos' },
  { path: ROUTES.GASTOS, icon: 'account_balance_wallet', label: 'Mis Gastos' },
  { path: ROUTES.DEUDAS, icon: 'credit_card', label: 'Deudas' },
  { path: ROUTES.REPORTS, icon: 'bar_chart', label: 'Reportes' },
];

export function BottomNav() {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMoreActive = moreItems.some(item => location.pathname === item.path);

  const closeMenu = useCallback(() => setShowMore(false), []);

  // Close menu on outside tap/click — use pointerdown (unified touch+mouse)
  useEffect(() => {
    if (!showMore) return;
    const handleClose = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener('pointerdown', handleClose);
    return () => {
      document.removeEventListener('pointerdown', handleClose);
    };
  }, [showMore, closeMenu]);

  // Close menu on route change
  /* eslint-disable react-hooks/set-state-in-effect -- Closing menu on navigation is a valid side effect */
  useEffect(() => {
    closeMenu();
  }, [location.pathname, closeMenu]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 w-full z-40"
      ref={menuRef}
      style={{ touchAction: 'manipulation' }}
    >
      {/* "More" menu popover */}
      {showMore && (
        <div className="absolute bottom-full left-0 w-full px-3 pb-2 animate-[slideUpFadeIn_200ms_ease-out]">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-clip">
            {moreItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-4 py-3.5 min-h-[44px] transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-slate-700 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div
        className="bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-700 pt-1 px-2"
        style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-around items-stretch h-14">
          {primaryItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] px-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-slate-400 active:text-slate-600 dark:active:text-slate-200'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {isActive && (
                  <div className="absolute top-1 w-1 h-1 rounded-full bg-primary" />
                )}
                <span className={`material-symbols-outlined text-[22px] ${item.filled && isActive ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* "More" button */}
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] px-2 rounded-lg transition-colors ${
              isMoreActive || showMore
                ? 'text-primary'
                : 'text-slate-400 active:text-slate-600 dark:active:text-slate-200'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            {isMoreActive && !showMore && (
              <div className="absolute top-1 w-1 h-1 rounded-full bg-primary" />
            )}
            <span className="material-symbols-outlined text-[22px]">
              {showMore ? 'close' : 'more_horiz'}
            </span>
            <span className="text-[11px] font-medium">Más</span>
          </button>
        </div>
      </div>
    </div>
  );
}
