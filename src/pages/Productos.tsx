import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { ProductoForm } from '../components/forms/ProductoForm';
import { ProduceProductoForm } from '../components/forms/ProduceProductoForm';
import { ProductosList } from '../components/lists/ProductosList';
import { useProductos } from '../hooks/useProductos';
import { useQuickProduce } from '../hooks/useQuickProduce';
import { useReverseProduction } from '../hooks/useProduction';
import { useToast } from '../hooks/useToast';
import type { ProductoWithCost, RecipeItemFormData } from '../lib/types';
import { supabase } from '../lib/supabase';

export function Productos() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<{
    id: string;
    name: string;
    recipe_items: RecipeItemFormData[];
  } | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const { data: productos, isLoading, error } = useProductos();

  // Quick produce state and hook
  const [isProduceModalOpen, setIsProduceModalOpen] = useState(false);
  const [selectedProductoForProduce, setSelectedProductoForProduce] = useState<ProductoWithCost | null>(null);
  const { quickProduce, isProducing } = useQuickProduce();
  const reverseMutation = useReverseProduction();

  const handleAdd = () => {
    setEditingProducto(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (producto: ProductoWithCost) => {
    setIsLoadingRecipe(true);

    try {
      // Fetch recipe items for this product
      const { data: recipeItems, error: recipeError } = await supabase
        .from('recipe_items')
        .select('*')
        .eq('producto_id', producto.id);

      if (recipeError) throw recipeError;

      setEditingProducto({
        id: producto.id,
        name: producto.name,
        recipe_items: (recipeItems || []).map((item) => ({
          insumo_id: item.insumo_id,
          quantity_in_base_units: item.quantity_in_base_units,
          use_categorias: item.use_categorias,
          required_categoria_ids: item.required_categoria_ids || [],
        })),
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

  const handleUndo = async (producto: ProductoWithCost) => {
    try {
      // Get the latest production history for this product
      const { data: latestProduction, error } = await supabase
        .from('production_history')
        .select('id')
        .eq('producto_id', producto.id)
        .order('production_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !latestProduction) {
        toast.warning('No hay producción para deshacer', 'No se encontró producción reciente de esta receta');
        return;
      }

      // Reverse the production
      await reverseMutation.mutateAsync({
        production_history_id: latestProduction.id,
        force: false,
      });
    } catch (err) {
      console.error('Error al deshacer:', err);
    }
  };

  return (
    <Layout
      title="Recetas"
      subtitle="Gestión de recetas"
      headerAction={
        <Button icon="add" size="sm" onClick={handleAdd}>
          Agregar
        </Button>
      }
    >
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-slate-700 dark:text-slate-300">Cargando recetas...</p>
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
            productos={productos || []}
            onEdit={handleEdit}
            onQuickProduce={handleQuickProduce}
            onUndo={handleUndo}
            isQuickProducing={isProducing}
          />
        )}

        {isLoadingRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
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
