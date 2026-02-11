import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CategoriaForm } from '../components/forms/CategoriaForm';
import { useCategorias, useDeleteCategoria, useInsumosByCategoriaCount } from '../hooks/useCategorias';
import type { Categoria, UnitType } from '../lib/types';

const unitLabels: Record<UnitType, string> = {
  kg: 'Kilogramos',
  l: 'Litros',
  g: 'Gramos',
  ml: 'Mililitros',
  unit: 'Unidades',
};

export function Categorias() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);

  const { data: categorias, isLoading } = useCategorias();
  const { data: insumosCount } = useInsumosByCategoriaCount();
  const deleteMutation = useDeleteCategoria();

  const handleCreate = () => {
    setSelectedCategoria(null);
    setIsFormOpen(true);
  };

  const handleEdit = (categoria: Categoria) => {
    setSelectedCategoria(categoria);
    setIsFormOpen(true);
  };

  const handleArchive = async (id: string) => {
    if (window.confirm('¿Archivar esta categoría? Los insumos asignados no se verán afectados.')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedCategoria(null);
  };

  return (
    <Layout
      title="Categorías"
      subtitle="Organiza tus insumos por tipos"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button icon="add" size="sm" onClick={handleCreate}>
            Nueva Categoría
          </Button>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-slate-700 dark:text-slate-300">Cargando categorías...</p>
          </div>
        ) : !categorias || categorias.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-[32px]">
                  category
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No hay categorías
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Crea categorías para organizar tus insumos. Por ejemplo: "Quesos tipo duro", "Harinas", "Mantecas".
              </p>
              <Button icon="add" onClick={handleCreate}>
                Crear Primera Categoría
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorias.map((categoria) => (
              <Card key={categoria.id}>
                <div className="space-y-4">
                  {/* Header con badge de color */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: categoria.color }}
                        aria-label={`Color ${categoria.color}`}
                      />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                        {categoria.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="edit"
                        onClick={() => handleEdit(categoria)}
                        aria-label={`Editar ${categoria.name}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="archive"
                        onClick={() => handleArchive(categoria.id)}
                        aria-label={`Archivar ${categoria.name}`}
                      />
                    </div>
                  </div>

                  {/* Tipo de unidad e Insumos */}
                  <div className="space-y-2">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Tipo de unidad
                        </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {unitLabels[categoria.unit_type]}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Insumos asignados
                        </span>
                        <span className="text-lg font-semibold text-slate-900 dark:text-white">
                          {insumosCount?.[categoria.id] || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fecha de creación */}
                  <div className="text-xs text-slate-500 dark:text-slate-500">
                    Creada el {new Date(categoria.created_at).toLocaleDateString('es-PY', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CategoriaForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        categoria={selectedCategoria}
      />
    </Layout>
  );
}
