import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CategoriaForm } from '../components/forms/CategoriaForm';
import { useTopProducts } from '../hooks/useDashboard';
import { useCategorias } from '../hooks/queries/useCategoriasQueries';
import { useDeleteCategoria } from '../hooks/mutations/useCategoriasMutations';
import { formatCurrency } from '../utils/formatters';
import type { Categoria } from '../lib/types';

export function Dashboard() {
  const { data: topProducts, isLoading } = useTopProducts(5);
  const { data: categorias } = useCategorias();
  const deleteMutation = useDeleteCategoria();

  const [isCatFormOpen, setIsCatFormOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);

  const handleAddCategoria = () => {
    setEditingCategoria(null);
    setIsCatFormOpen(true);
  };

  const handleEditCategoria = (cat: Categoria) => {
    setEditingCategoria(cat);
    setIsCatFormOpen(true);
  };

  const handleArchiveCategoria = async (e: React.MouseEvent, cat: Categoria) => {
    e.stopPropagation();
    if (window.confirm(`¿Archivar la categoría "${cat.name}"?`)) {
      await deleteMutation.mutateAsync(cat.id);
    }
  };

  const handleCloseCatForm = () => {
    setIsCatFormOpen(false);
    setEditingCategoria(null);
  };

  if (isLoading) {
    return (
      <Layout title="Inicio" subtitle="Resumen">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Inicio" subtitle="Resumen">
      <div className="space-y-4">
        {/* Productos más vendidos */}
        {topProducts && topProducts.length > 0 ? (
          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Productos más vendidos
            </h3>
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={product.producto_name}
                  className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 dark:text-white truncate">
                        {product.producto_name}
                      </h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {product.total_quantity} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(product.total_income)}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      +{formatCurrency(product.total_profit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="text-center py-12">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
              analytics
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No hay datos aún
            </h3>
            <p className="text-slate-700 dark:text-slate-300">
              Comienza registrando ventas para ver estadísticas
            </p>
          </Card>
        )}

        {/* Categorías */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Categorías
            </h3>
            <Button
              size="sm"
              variant="ghost"
              icon="add"
              onClick={handleAddCategoria}
            >
              Nueva
            </Button>
          </div>

          {categorias && categorias.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <div
                  key={cat.id}
                  className="inline-flex items-center rounded-full text-sm font-medium text-white overflow-hidden"
                  style={{ backgroundColor: cat.color }}
                >
                  <button
                    type="button"
                    onClick={() => handleEditCategoria(cat)}
                    className="pl-3 pr-1 py-1.5 hover:brightness-90 transition-all"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {cat.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleArchiveCategoria(e, cat)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center justify-center pl-1 pr-2 py-1.5 hover:brightness-90 transition-all"
                    style={{ touchAction: 'manipulation' }}
                    aria-label={`Archivar ${cat.name}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      close
                    </span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No hay categorías. Creá la primera.
            </p>
          )}
        </Card>
      </div>

      <CategoriaForm
        isOpen={isCatFormOpen}
        onClose={handleCloseCatForm}
        categoria={editingCategoria}
      />
    </Layout>
  );
}
