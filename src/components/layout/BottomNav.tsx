import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';

export function BottomNav() {
  const location = useLocation();

  const navItems = [
    {
      path: ROUTES.DASHBOARD,
      icon: 'dashboard',
      label: 'Inicio',
      filled: true,
    },
    {
      path: ROUTES.INSUMOS,
      icon: 'inventory_2',
      label: 'Insumos',
    },
    {
      path: ROUTES.PRODUCTOS,
      icon: 'bakery_dining',
      label: 'Productos',
    },
    {
      path: ROUTES.STOCK,
      icon: 'warehouse',
      label: 'Stock',
    },
    {
      path: ROUTES.VENTAS,
      icon: 'receipt_long',
      label: 'Ventas',
    },
    {
      path: ROUTES.REPORTS,
      icon: 'bar_chart',
      label: 'Reportes',
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-700 pb-safe pt-2 px-6 z-40">
      <div className="flex justify-between items-end h-16 pb-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 flex-1 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <span className={`material-symbols-outlined ${item.filled && isActive ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
