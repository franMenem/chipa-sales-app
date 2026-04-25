import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  const operacionesItems = [
    { path: ROUTES.DASHBOARD, icon: 'dashboard', label: 'Inicio', filled: true },
    { path: ROUTES.INSUMOS, icon: 'inventory_2', label: 'Insumos' },
    { path: ROUTES.PRODUCTOS, icon: 'bakery_dining', label: 'Recetas' },
    { path: ROUTES.STOCK, icon: 'warehouse', label: 'Stock' },
    { path: ROUTES.VENTAS, icon: 'receipt_long', label: 'Ventas' },
  ];

  const finanzasItems = [
    { path: ROUTES.GASTOS, icon: 'account_balance_wallet', label: 'Mis Gastos' },
    { path: ROUTES.DEUDAS, icon: 'credit_card', label: 'Deudas' },
    { path: ROUTES.COSTOS_FIJOS, icon: 'payments', label: 'Costos Fijos' },
    { path: ROUTES.REPORTS, icon: 'bar_chart', label: 'Reportes' },
  ];

  return (
    <aside
      className={`hidden md:block fixed left-0 top-0 h-screen bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-700 z-40 transition-all duration-200 ${
        isCollapsed ? 'w-14' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Logo/Brand */}
        <div className={`flex items-center border-b border-slate-200 dark:border-slate-700 ${isCollapsed ? 'justify-center px-0 py-5' : 'gap-3 px-6 py-5'}`}>
          <span className="material-symbols-outlined text-primary text-3xl filled flex-shrink-0">
            bakery_dining
          </span>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold">Chipa Sales</h1>
              <p className="text-xs text-slate-700 dark:text-slate-300">Gestión de ventas</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Operaciones Section */}
          <div className="mb-6">
            {!isCollapsed && (
              <div className="px-6 mb-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Operaciones
                </h3>
              </div>
            )}
            <ul className={`space-y-1 ${isCollapsed ? 'px-1' : 'px-3'}`}>
              {operacionesItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg transition-colors ${
                        isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <span className={`material-symbols-outlined flex-shrink-0 ${item.filled && isActive ? 'filled' : ''}`}>
                        {item.icon}
                      </span>
                      {!isCollapsed && <span className="text-sm">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Finanzas Section */}
          <div>
            {!isCollapsed && (
              <div className="px-6 mb-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Finanzas
                </h3>
              </div>
            )}
            <ul className={`space-y-1 ${isCollapsed ? 'px-1' : 'px-3'}`}>
              {finanzasItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg transition-colors ${
                        isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <span className="material-symbols-outlined flex-shrink-0">
                        {item.icon}
                      </span>
                      {!isCollapsed && <span className="text-sm">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Toggle button */}
        <div className={`border-t border-slate-200 dark:border-slate-700 p-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={onToggle}
            title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors touch-manipulation ${
              isCollapsed ? 'justify-center w-10' : 'w-full'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] flex-shrink-0">
              {isCollapsed ? 'menu_open' : 'menu'}
            </span>
            {!isCollapsed && <span className="text-sm">Colapsar</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
