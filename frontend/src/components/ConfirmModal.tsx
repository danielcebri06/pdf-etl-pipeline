import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Eliminar',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          </div>

          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs leading-relaxed text-slate-300">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-slate-950/50 px-5 py-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-rose-500 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {loading ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}