import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';

export function Sidebar() {
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
    <aside className="hidden md:block fixed left-0 top-0 h-screen w-64 bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-700 z-50">
      <div className="flex flex-col h-full">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-primary text-3xl filled">
            bakery_dining
          </span>
          <div>
            <h1 className="text-lg font-bold">Chipa Sales</h1>
            <p className="text-xs text-slate-700 dark:text-slate-300">Gestión de ventas</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className={`material-symbols-outlined ${item.filled && isActive ? 'filled' : ''}`}>
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
