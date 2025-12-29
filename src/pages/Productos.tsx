import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { ProductoForm } from '../components/forms/ProductoForm';
import { ProductosList } from '../components/lists/ProductosList';
import { useProductos } from '../hooks/useProductos';
import type { ProductoWithCost } from '../lib/types';
import { supabase } from '../lib/supabase';

export function Productos() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<{
    id: string;
    name: string;
    price_sale: number;
    margin_goal?: number | null;
    recipe_items: Array<{
      insumo_id: string;
      quantity_in_base_units: number;
    }>;
  } | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const { data: productos, isLoading, error } = useProductos();

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
        price_sale: producto.price_sale,
        margin_goal: producto.margin_goal,
        recipe_items: (recipeItems || []).map((item) => ({
          insumo_id: item.insumo_id,
          quantity_in_base_units: item.quantity_in_base_units,
        })),
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error loading recipe:', err);
      alert('Error al cargar la receta del producto');
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProducto(null);
  };

  return (
    <Layout
      title="Productos"
      subtitle="Gestión de productos"
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
            <p className="text-slate-500 dark:text-slate-400">Cargando productos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-red-500 text-6xl mb-4">
              error
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Error al cargar productos
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-center">
              {error instanceof Error ? error.message : 'Ocurrió un error inesperado'}
            </p>
          </div>
        ) : (
          <ProductosList productos={productos || []} onEdit={handleEdit} />
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
    </Layout>
  );
}
