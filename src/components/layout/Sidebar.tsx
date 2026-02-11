import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';

export function Sidebar() {
  const location = useLocation();

  const operacionesItems = [
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
      path: ROUTES.CATEGORIAS,
      icon: 'category',
      label: 'Categorías',
    },
    {
      path: ROUTES.PRODUCTOS,
      icon: 'bakery_dining',
      label: 'Recetas',
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
  ];

  const finanzasItems = [
    {
      path: ROUTES.GASTOS,
      icon: 'account_balance_wallet',
      label: 'Mis Gastos',
    },
    {
      path: ROUTES.COSTOS_FIJOS,
      icon: 'payments',
      label: 'Costos Fijos',
    },
    {
      path: ROUTES.REPORTS,
      icon: 'bar_chart',
      label: 'Reportes',
    },
  ];

  return (
    <aside className="hidden md:block fixed left-0 top-0 h-screen w-64 bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-700 z-40">
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
          {/* Operaciones Section */}
          <div className="mb-6">
            <div className="px-6 mb-2">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Operaciones
              </h3>
            </div>
            <ul className="space-y-1 px-3">
              {operacionesItems.map((item) => {
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
                      <span className={`material-symbols-outlined ${('filled' in item && item.filled && isActive) ? 'filled' : ''}`}>
                        {item.icon}
                      </span>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Finanzas Section */}
          <div>
            <div className="px-6 mb-2">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Finanzas
              </h3>
            </div>
            <ul className="space-y-1 px-3">
              {finanzasItems.map((item) => {
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
                      <span className={`material-symbols-outlined ${('filled' in item && item.filled && isActive) ? 'filled' : ''}`}>
                        {item.icon}
                      </span>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
}
