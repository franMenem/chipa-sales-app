import { useState } from 'react';
import type { Deuda } from '../../lib/types';

export interface DeudaModalsState {
  isDeudaModalOpen: boolean;
  isPagoModalOpen: boolean;
  editingDeuda: Deuda | null;
  selectedDeuda: Deuda | null;
  expandedDeudaId: string | null;
  handleAddDeuda: () => void;
  handleEditDeuda: (deuda: Deuda) => void;
  handleAddPago: (deuda: Deuda) => void;
  closeDeudaModal: (isPending?: boolean) => void;
  closePagoModal: (isPending?: boolean) => void;
  toggleExpand: (deudaId: string) => void;
  collapseDeuda: (deudaId: string) => void;
}

export function useDeudaModals(): DeudaModalsState {
  const [isDeudaModalOpen, setIsDeudaModalOpen] = useState(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [editingDeuda, setEditingDeuda] = useState<Deuda | null>(null);
  const [selectedDeuda, setSelectedDeuda] = useState<Deuda | null>(null);
  const [expandedDeudaId, setExpandedDeudaId] = useState<string | null>(null);

  return {
    isDeudaModalOpen,
    isPagoModalOpen,
    editingDeuda,
    selectedDeuda,
    expandedDeudaId,
    handleAddDeuda: () => {
      setEditingDeuda(null);
      setIsDeudaModalOpen(true);
    },
    handleEditDeuda: (deuda) => {
      setEditingDeuda(deuda);
      setIsDeudaModalOpen(true);
    },
    handleAddPago: (deuda) => {
      setSelectedDeuda(deuda);
      setIsPagoModalOpen(true);
    },
    closeDeudaModal: (isPending = false) => {
      if (!isPending) {
        setIsDeudaModalOpen(false);
        setEditingDeuda(null);
      }
    },
    closePagoModal: (isPending = false) => {
      if (!isPending) {
        setIsPagoModalOpen(false);
        setSelectedDeuda(null);
      }
    },
    toggleExpand: (deudaId) => {
      setExpandedDeudaId((prev) => (prev === deudaId ? null : deudaId));
    },
    collapseDeuda: (deudaId) => {
      setExpandedDeudaId((prev) => (prev === deudaId ? null : prev));
    },
  };
}
