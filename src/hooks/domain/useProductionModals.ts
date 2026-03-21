import { useState } from 'react';
import type { ProductoWithCost } from '../../lib/types';

export interface ProductionModalsState {
  isProduceModalOpen: boolean;
  isAdjustModalOpen: boolean;
  selectedProductoId: string | undefined;
  selectedProducto: ProductoWithCost | null;
  handleProduce: (productoId?: string) => void;
  handleAdjustStock: (producto: ProductoWithCost) => void;
  closeProduceModal: () => void;
  closeAdjustModal: () => void;
}

export function useProductionModals(): ProductionModalsState {
  const [isProduceModalOpen, setIsProduceModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductoId, setSelectedProductoId] = useState<string | undefined>(undefined);
  const [selectedProducto, setSelectedProducto] = useState<ProductoWithCost | null>(null);

  return {
    isProduceModalOpen,
    isAdjustModalOpen,
    selectedProductoId,
    selectedProducto,
    handleProduce: (productoId) => {
      setSelectedProductoId(productoId);
      setIsProduceModalOpen(true);
    },
    handleAdjustStock: (producto) => {
      setSelectedProducto(producto);
      setIsAdjustModalOpen(true);
    },
    closeProduceModal: () => {
      setIsProduceModalOpen(false);
      setSelectedProductoId(undefined);
    },
    closeAdjustModal: () => {
      setIsAdjustModalOpen(false);
      setSelectedProducto(null);
    },
  };
}
