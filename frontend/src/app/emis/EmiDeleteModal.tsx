import { CircleStop, Loader2, Trash2 } from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { formatInr } from '../../shared/utils/money';
import type { EmiEditScope } from './emi.types';

interface DeletableEmiInstallment {
  amountPaise: number;
  date: string;
}

interface EmiDeleteModalProps {
  error: string;
  installment: DeletableEmiInstallment | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onScopeChange: (scope: EmiEditScope) => void;
  scope: EmiEditScope;
}

export function EmiDeleteModal({
  error,
  installment,
  isDeleting,
  onClose,
  onConfirm,
  onScopeChange,
  scope,
}: EmiDeleteModalProps) {
  return (
    <Modal
      description={
        installment
          ? `${formatMonth(installment.date)} · ${formatInr(installment.amountPaise)}`
          : undefined
      }
      isOpen={Boolean(installment)}
      onClose={onClose}
      title="Delete EMI installment"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 rounded-md border border-rose-100 bg-rose-50 p-1">
          {(
            [
              ['single', 'This installment'],
              ['future', 'This + future'],
            ] as [EmiEditScope, string][]
          ).map(([value, label]) => (
            <button
              className={[
                'rounded-md px-3 py-2 text-xs font-bold transition',
                scope === value ? 'bg-rose-500 text-white' : 'text-rose-700',
              ].join(' ')}
              key={value}
              onClick={() => onScopeChange(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {scope === 'future' ? (
          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            <CircleStop className="mt-0.5 shrink-0" size={14} />
            The plan stops at this installment. Earlier months stay unchanged.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
            disabled={isDeleting}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-rose-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Trash2 size={14} />
            )}
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

function formatMonth(dateValue: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00`));
}
