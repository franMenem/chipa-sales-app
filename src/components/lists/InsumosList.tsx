import { useState } from 'react';
import type { Insumo } from '../../lib/types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SearchBar } from '../ui/SearchBar';
import { useDeleteInsumo } from '../../hooks/useInsumos';

interface InsumosListProps {
  insumos: Insumo[];
  onEdit: (insumo: Insumo) => void;
}

const unitLabels = {
  kg: 'kg',
  l: 'L',
  g: 'g',
  ml: 'ml',
  unit: 'ud',
};

export function InsumosList({ insumos, onEdit }: InsumosListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const deleteMutation = useDeleteInsumo();

  const filteredInsumos = insumos.filter((insumo) =>
    insumo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar "${name}"?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (insumos.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
          inventory_2
        </span>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          No hay insumos
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          Agrega tu primer insumo para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar
        placeholder="Buscar insumo..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onClear={() => setSearchTerm('')}
      />

      {filteredInsumos.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-5xl mb-3">
            search_off
          </span>
          <p className="text-slate-500 dark:text-slate-400">
            No se encontraron insumos con "{searchTerm}"
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInsumos.map((insumo) => (
            <Card key={insumo.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      inventory_2
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {insumo.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <span>
                        {formatCurrency(insumo.price_per_unit)} / {unitLabels[insumo.unit_type]}
                      </span>
                      <span className="text-xs">•</span>
                      <span className="text-xs">
                        Costo base: {formatCurrency(insumo.base_unit_cost)}/{unitLabels[insumo.unit_type] === 'kg' || unitLabels[insumo.unit_type] === 'L' ? 'g o ml' : 'ud'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="edit"
                    onClick={() => onEdit(insumo)}
                    aria-label={`Editar ${insumo.name}`}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="delete"
                    onClick={() => handleDelete(insumo.id, insumo.name)}
                    disabled={deleteMutation.isPending}
                    aria-label={`Eliminar ${insumo.name}`}
                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
