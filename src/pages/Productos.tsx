import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { ProductoForm } from '../components/forms/ProductoForm';
import { ProduceProductoForm } from '../components/forms/ProduceProductoForm';
import { ProductosList } from '../components/lists/ProductosList';
import { useProductos } from '../hooks/queries/useProductosQueries';
import { useArchiveProducto, useRestoreProducto } from '../hooks/mutations/useProductosMutations';
import { useQuickProduce } from '../hooks/useQuickProduce';
import { useReverseProduction } from '../hooks/useProduction';
import { useToast } from '../hooks/useToast';
import { fetchLatestProductionHistory, fetchRecipeItems } from '../lib/queries';
import type { ProductoWithCost, RecipeItemFormData } from '../lib/types';

export function Productos() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<{
    id: string;
    name: string;
    recipe_items: RecipeItemFormData[];
  } | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: productos, isLoading, error } = useProductos(true);
  const { data: archivedProductos, isLoading: isLoadingArchived } = useProductos(false);

  // Quick produce state and hook
  const [isProduceModalOpen, setIsProduceModalOpen] = useState(false);
  const [selectedProductoForProduce, setSelectedProductoForProduce] = useState<ProductoWithCost | null>(null);
  const { quickProduce, isProducing } = useQuickProduce();
  const reverseMutation = useReverseProduction();
  const archiveMutation = useArchiveProducto();
  const restoreMutation = useRestoreProducto();

  const archivedCount = archivedProductos?.length ?? 0;

  const handleAdd = () => {
    setEditingProducto(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (producto: ProductoWithCost) => {
    setIsLoadingRecipe(true);

    try {
      const recipeItems = await fetchRecipeItems(producto.id);

      setEditingProducto({
        id: producto.id,
        name: producto.name,
        recipe_items: recipeItems,
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error loading recipe:', err);
      toast.error('Error al cargar', 'No se pudo cargar la receta');
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProducto(null);
  };

  const handleQuickProduce = async (producto: ProductoWithCost) => {
    const result = await quickProduce(producto);

    // If quick produce fails, open the full production form as fallback
    if (result.shouldOpenForm) {
      setSelectedProductoForProduce(producto);
      setIsProduceModalOpen(true);
    }
  };

  const handleArchive = (producto: ProductoWithCost) => {
    archiveMutation.mutate(producto.id);
  };

  const handleRestore = (producto: ProductoWithCost) => {
    restoreMutation.mutate(producto.id);
  };

  const handleUndo = async (producto: ProductoWithCost) => {
    try {
      const productionId = await fetchLatestProductionHistory(producto.id);

      if (!productionId) {
        toast.warning('No hay producción para deshacer', 'No se encontró producción reciente de esta receta');
        return;
      }

      await reverseMutation.mutateAsync({
        production_history_id: productionId,
        force: false,
      });
    } catch (err) {
      console.error('Error al deshacer:', err);
    }
  };

  const isListLoading = showArchived ? isLoadingArchived : isLoading;
  const displayedProductos = showArchived ? (archivedProductos || []) : (productos || []);

  return (
    <Layout
      title="Recetas"
      subtitle="Gestión de recetas"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {!showArchived && (
            <Button icon="add" size="sm" onClick={handleAdd}>
              Nueva Receta
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
            aria-pressed={showArchived}
          >
            <span className="material-symbols-outlined text-[18px]">
              {showArchived ? 'visibility' : 'visibility_off'}
            </span>
            <span className="ml-1">
              {showArchived
                ? 'Ver activas'
                : `Archivadas${archivedCount > 0 ? ` (${archivedCount})` : ''}`}
            </span>
          </Button>
        </div>

        {isListLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-slate-700 dark:text-slate-300">
              {showArchived ? 'Cargando recetas archivadas...' : 'Cargando recetas...'}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-red-500 text-6xl mb-4">
              error
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Error al cargar recetas
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-center">
              {error instanceof Error ? error.message : 'Ocurrió un error inesperado'}
            </p>
          </div>
        ) : (
          <ProductosList
            productos={displayedProductos}
            onEdit={handleEdit}
            onQuickProduce={handleQuickProduce}
            onUndo={handleUndo}
            onArchive={handleArchive}
            onRestore={showArchived ? handleRestore : undefined}
            isQuickProducing={isProducing}
          />
        )}

        {isLoadingRecipe && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <ProductoForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editData={editingProducto || undefined}
      />

      {/* Fallback: Production form for when quick produce fails */}
      {selectedProductoForProduce && (
        <ProduceProductoForm
          isOpen={isProduceModalOpen}
          onClose={() => {
            setIsProduceModalOpen(false);
            setSelectedProductoForProduce(null);
          }}
          preselectedProductoId={selectedProductoForProduce.id}
        />
      )}
    </Layout>
  );
}
