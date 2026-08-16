import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarDays, Check, IndianRupee, Loader2, Pencil } from 'lucide-react';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { Modal } from '../../shared/components/Modal';
import { normalizeInrInput, parseInrToPaise } from '../../shared/utils/money';
import type { TagOption } from '../expenses/expenses.types';
import type {
  EmiAmountMode,
  EmiEditScope,
  EmiInstallment,
  EmiPlanDetail,
} from './emi.types';

interface EmiInstallmentModalProps {
  installment: EmiInstallment | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (detail: EmiPlanDetail) => void;
  plan: EmiPlanDetail | null;
}

export function EmiInstallmentModal({
  installment,
  isOpen,
  onClose,
  onSaved,
  plan,
}: EmiInstallmentModalProps) {
  const [scope, setScope] = useState<EmiEditScope>('single');
  const [amountMode, setAmountMode] = useState<EmiAmountMode>('monthly');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [numberOfMonths, setNumberOfMonths] = useState('1');
  const [note, setNote] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const remainingFromSelected = useMemo(() => {
    if (!installment || !plan) {
      return 1;
    }

    return plan.installments.filter(
      (item) => item.installmentNumber >= installment.installmentNumber,
    ).length;
  }, [installment, plan]);

  useEffect(() => {
    if (!isOpen || !installment) {
      return;
    }

    setScope('single');
    setAmountMode('monthly');
    setAmount((installment.amountPaise / 100).toFixed(2));
    setDate(installment.date);
    setNumberOfMonths(String(remainingFromSelected));
    setNote(installment.note ?? '');
    setTagIds(installment.tags.map((tag) => tag.id));
    setError('');

    const controller = new AbortController();
    void loadTags(controller.signal);

    return () => controller.abort();
  }, [installment, isOpen, remainingFromSelected]);

  async function loadTags(signal: AbortSignal) {
    try {
      const response = await apiFetch('/tags', { signal });
      const data = await readApiBody(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Unable to load tags.'));
      }

      if (!signal.aborted) {
        setTags(Array.isArray(data) ? data : []);
      }
    } catch (requestError) {
      if (!signal.aborted) {
        setError(
          requestError instanceof Error ? requestError.message : 'Unable to load tags.',
        );
      }
    }
  }

  function toggleTag(tagId: string) {
    setTagIds((currentIds) =>
      currentIds.includes(tagId)
        ? currentIds.filter((currentId) => currentId !== tagId)
        : [...currentIds, tagId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!plan || !installment) {
      return;
    }

    const amountPaise = parseInrToPaise(amount);
    const months = Number(numberOfMonths);

    if (!amountPaise) {
      setError('Enter a valid EMI amount.');
      return;
    }

    if (
      scope === 'future' &&
      (!Number.isInteger(months) || months < 1 || months > 600)
    ) {
      setError('Enter a valid number of months between 1 and 600.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await apiFetch(
        `/emis/${plan.id}/installments/${installment.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            scope,
            amountPaise,
            date,
            note: note.trim(),
            tagIds,
            ...(scope === 'future'
              ? { amountMode, numberOfMonths: months }
              : {}),
          }),
        },
      );
      const data = await readApiBody(response);

      if (!response.ok) {
        setError(getApiErrorMessage(data, 'Unable to update this EMI.'));
        return;
      }

      onSaved(data as EmiPlanDetail);
      onClose();
    } catch {
      setError('Unable to reach the API. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      description={
        installment
          ? `Installment ${installment.installmentNumber} of ${installment.installmentCount}`
          : undefined
      }
      isOpen={isOpen}
      onClose={isSaving ? () => undefined : onClose}
      title="Edit EMI"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <p className="text-xs font-semibold text-zinc-800">Apply changes to</p>
          <div className="mt-1.5 grid grid-cols-2 rounded-md border border-zinc-200 bg-white p-1">
            {(
              [
                ['single', 'This installment'],
                ['future', 'This + future'],
              ] as [EmiEditScope, string][]
            ).map(([value, label]) => (
              <button
                className={[
                  'rounded-md px-3 py-2 text-xs font-bold transition',
                  scope === value
                    ? 'bg-zinc-950 text-white'
                    : 'text-zinc-500 hover:text-zinc-900',
                ].join(' ')}
                key={value}
                onClick={() => setScope(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {scope === 'future' ? (
          <div>
            <p className="text-xs font-semibold text-zinc-800">Amount entered as</p>
            <div className="mt-1.5 grid grid-cols-2 rounded-md border border-[#d8e9e6] bg-[#f5fbfa] p-1">
              {(
                [
                  ['monthly', 'Monthly EMI'],
                  ['total', 'Future total'],
                ] as [EmiAmountMode, string][]
              ).map(([value, label]) => (
                <button
                  className={[
                    'rounded-md px-3 py-2 text-xs font-bold transition',
                    amountMode === value
                      ? 'bg-[#66bfb6] text-white'
                      : 'text-zinc-500 hover:text-zinc-900',
                  ].join(' ')}
                  key={value}
                  onClick={() => setAmountMode(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={scope === 'future' ? 'grid gap-3 sm:grid-cols-3' : 'grid gap-3 sm:grid-cols-2'}>
          <label className="block">
            <span className="text-xs font-semibold text-zinc-800">Date</span>
            <span className="mt-1.5 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-within:border-[#66bfb6] focus-within:ring-4 focus-within:ring-[#66bfb6]/10">
              <CalendarDays className="text-zinc-400" size={14} />
              <input
                className="min-w-0 flex-1 bg-transparent outline-none"
                onChange={(event) => setDate(event.target.value)}
                required
                type="date"
                value={date}
              />
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-zinc-800">
              {scope === 'future' && amountMode === 'total' ? 'Future total' : 'Amount'}
            </span>
            <span className="mt-1.5 flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-within:border-[#66bfb6] focus-within:ring-4 focus-within:ring-[#66bfb6]/10">
              <IndianRupee className="text-zinc-400" size={14} />
              <input
                className="min-w-0 flex-1 bg-transparent outline-none"
                inputMode="decimal"
                onChange={(event) => setAmount(normalizeInrInput(event.target.value))}
                pattern="\d+(\.\d{0,2})?"
                required
                type="text"
                value={amount}
              />
            </span>
          </label>

          {scope === 'future' ? (
            <label className="block">
              <span className="text-xs font-semibold text-zinc-800">Future months</span>
              <input
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#66bfb6] focus:ring-4 focus:ring-[#66bfb6]/10"
                inputMode="numeric"
                max={600}
                min={1}
                onChange={(event) => setNumberOfMonths(event.target.value)}
                required
                type="number"
                value={numberOfMonths}
              />
            </label>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-semibold text-zinc-800">Tags</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const selected = tagIds.includes(tag.id);

              return (
                <button
                  className={[
                    'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold leading-none transition',
                    selected
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400',
                  ].join(' ')}
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  type="button"
                >
                  {selected ? <Check size={10} /> : null}
                  {tag.name}
                </button>
              );
            })}
            {!tags.length ? (
              <span className="text-xs text-zinc-400">No tags</span>
            ) : null}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-zinc-800">Note</span>
          <textarea
            className="mt-1.5 min-h-20 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#66bfb6] focus:ring-4 focus:ring-[#66bfb6]/10"
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </label>

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-[#66bfb6] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#4fa89f] disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Pencil size={14} />}
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
