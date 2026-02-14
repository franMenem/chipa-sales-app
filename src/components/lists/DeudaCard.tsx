import { Card } from '../ui/Card';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Deuda, DeudaPago } from '../../lib/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30' },
  parcial: { label: 'Parcial', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30' },
  pagada: { label: 'Pagada', color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30' },
};

interface DeudaCardProps {
  deuda: Deuda;
  isExpanded: boolean;
  pagos: DeudaPago[] | undefined;
  isDeletePending: boolean;
  onAddPago: (deuda: Deuda) => void;
  onEdit: (deuda: Deuda) => void;
  onDelete: (deuda: Deuda) => void;
  onDeletePago: (pagoId: string) => void;
  onToggleExpand: (deudaId: string) => void;
}

export function DeudaCard({
  deuda,
  isExpanded,
  pagos,
  isDeletePending,
  onAddPago,
  onEdit,
  onDelete,
  onDeletePago,
  onToggleExpand,
}: DeudaCardProps) {
  const statusInfo = STATUS_LABELS[deuda.status] || STATUS_LABELS.pendiente;
  const progress = deuda.total_amount > 0 ? (deuda.paid_amount / deuda.total_amount) * 100 : 0;

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="p-3 sm:p-4">
        {/* Title + status badge */}
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate flex-1 min-w-0">
            {deuda.description}
          </h4>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* Creditor + due date */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          {deuda.creditor_name}
          {deuda.due_date && <> · Vence: {formatDate(deuda.due_date)}</>}
        </p>

        {/* Amount row */}
        <div className="flex items-center justify-between gap-2 text-sm mb-2 min-w-0">
          <span className="text-slate-600 dark:text-slate-400 truncate">
            {formatCurrency(deuda.paid_amount)} / {formatCurrency(deuda.total_amount)}
          </span>
          <span className="font-semibold text-amber-600 dark:text-amber-400 shrink-0">
            Resta: {formatCurrency(deuda.remaining_amount)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              progress >= 100 ? 'bg-green-500' : progress > 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {deuda.notes && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
            {deuda.notes}
          </p>
        )}

        {/* Action buttons - own row to avoid overlapping description */}
        <div className="flex items-center gap-1 mt-2 -mx-1">
          {deuda.status !== 'pagada' && (
            <button
              type="button"
              onClick={() => onAddPago(deuda)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
              style={{ touchAction: 'manipulation' }}
              title="Registrar pago"
            >
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px]">
                add_card
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(deuda)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            style={{ touchAction: 'manipulation' }}
            title="Editar"
          >
            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[20px]">edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(deuda)}
            disabled={isDeletePending}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            style={{ touchAction: 'manipulation' }}
            title="Eliminar"
          >
            <span className="material-symbols-outlined text-red-500 dark:text-red-400 text-[20px]">delete</span>
          </button>
        </div>
      </div>

      {/* Expand toggle for pagos */}
      <button
        type="button"
        onClick={() => onToggleExpand(deuda.id)}
        className="w-full flex items-center justify-center gap-1 min-h-[44px] border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        style={{ touchAction: 'manipulation' }}
      >
        <span className="material-symbols-outlined text-[16px]">
          {isExpanded ? 'expand_less' : 'expand_more'}
        </span>
        {isExpanded ? 'Ocultar pagos' : 'Ver pagos'}
      </button>

      {/* Pagos list */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          {!pagos || pagos.length === 0 ? (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-4">
              Sin pagos registrados
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagos.map((pago) => (
                <div key={pago.id} className="flex items-center justify-between px-3 sm:px-4 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        -{formatCurrency(pago.amount)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(pago.payment_date)}
                      </span>
                    </div>
                    {pago.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {pago.notes}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeletePago(pago.id)}
                    disabled={isDeletePending}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 shrink-0"
                    style={{ touchAction: 'manipulation' }}
                    title="Eliminar pago"
                  >
                    <span className="material-symbols-outlined text-red-400 text-[16px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
