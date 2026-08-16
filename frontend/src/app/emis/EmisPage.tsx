import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { ExpenseCategoryKey } from '../../common';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { Modal } from '../../shared/components/Modal';
import { formatInr } from '../../shared/utils/money';
import type { ExpenseItem } from '../expenses/expenses.types';
import { AddExpenseModal } from '../home/AddExpenseModal';
import { EmiDeleteModal } from './EmiDeleteModal';
import { EmiInstallmentModal } from './EmiInstallmentModal';
import type {
  EmiEditScope,
  EmiInstallment,
  EmiPlanDetail,
  EmiPlanSummary,
  ListEmiPlansResponse,
} from './emi.types';

interface DeleteTarget {
  installment: EmiInstallment;
  plan: EmiPlanDetail;
}

interface PlanMetadataTarget {
  id: string;
  lender: string;
  name: string;
}

async function fetchApi<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await apiFetch(path, { signal });
  const data = await readApiBody(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, 'Unable to load EMIs.'));
  }

  return data as T;
}

function EmisPage() {
  const [data, setData] = useState<ListEmiPlansResponse | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<EmiPlanDetail | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState('');
  const [legacyExpenses, setLegacyExpenses] = useState<ExpenseItem[] | null>(null);
  const [isLoadingLegacy, setIsLoadingLegacy] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] =
    useState<EmiInstallment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteScope, setDeleteScope] = useState<EmiEditScope>('single');
  const [metadataTarget, setMetadataTarget] =
    useState<PlanMetadataTarget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void loadPlans(controller.signal);

    return () => controller.abort();
  }, []);

  async function loadPlans(signal?: AbortSignal) {
    setIsLoading(true);
    setError('');

    try {
      const nextData = await fetchApi<ListEmiPlansResponse>('/emis', signal);

      if (!signal?.aborted) {
        setData(nextData);
      }
    } catch (requestError) {
      if (!signal?.aborted) {
        setError(
          requestError instanceof Error ? requestError.message : 'Unable to load EMIs.',
        );
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }

  async function togglePlan(planId: string) {
    if (expandedPlan?.id === planId) {
      setExpandedPlan(null);
      return;
    }

    setLoadingPlanId(planId);
    setError('');

    try {
      setExpandedPlan(await fetchApi<EmiPlanDetail>(`/emis/${planId}`));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to load EMI.',
      );
    } finally {
      setLoadingPlanId('');
    }
  }

  async function loadLegacyExpenses() {
    setIsLoadingLegacy(true);
    setError('');

    try {
      setLegacyExpenses(await fetchApi<ExpenseItem[]>('/emis/legacy'));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load previous EMI records.',
      );
    } finally {
      setIsLoadingLegacy(false);
    }
  }

  function handleDetailChanged(detail: EmiPlanDetail) {
    setExpandedPlan(detail);
    void loadPlans();
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setModalError('');

    try {
      const query = new URLSearchParams({ scope: deleteScope });
      const response = await apiFetch(
        `/emis/${deleteTarget.plan.id}/installments/${deleteTarget.installment.id}?${query.toString()}`,
        { method: 'DELETE' },
      );
      const responseData = await readApiBody(response);

      if (!response.ok) {
        setModalError(getApiErrorMessage(responseData, 'Unable to delete EMI.'));
        return;
      }

      const detail = await fetchApi<EmiPlanDetail>(`/emis/${deleteTarget.plan.id}`);
      setDeleteTarget(null);
      setExpandedPlan(detail);
      void loadPlans();
    } catch {
      setModalError('Unable to reach the API. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleMetadataSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!metadataTarget || !metadataTarget.name.trim()) {
      setModalError('Enter an EMI name.');
      return;
    }

    setIsSavingMetadata(true);
    setModalError('');

    try {
      const response = await apiFetch(`/emis/${metadataTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: metadataTarget.name.trim(),
          lender: metadataTarget.lender.trim(),
        }),
      });
      const responseData = await readApiBody(response);

      if (!response.ok) {
        setModalError(getApiErrorMessage(responseData, 'Unable to update EMI.'));
        return;
      }

      const detail = responseData as EmiPlanDetail;
      setMetadataTarget(null);
      setExpandedPlan((current) => (current?.id === detail.id ? detail : current));
      void loadPlans();
    } catch {
      setModalError('Unable to reach the API. Please try again.');
    } finally {
      setIsSavingMetadata(false);
    }
  }

  const plans = data?.plans ?? [];

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-[#f36f4e]">SpendWise</p>
          <h2 className="mt-3 text-4xl font-bold text-zinc-950 sm:text-5xl">EMIs</h2>
        </div>

        <div className="flex gap-2">
          <button
            aria-label="Refresh EMIs"
            className="grid size-10 place-items-center rounded-md border border-[#eadfd5] bg-white text-zinc-600 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e] disabled:opacity-60"
            disabled={isLoading}
            onClick={() => loadPlans()}
            title="Refresh EMIs"
            type="button"
          >
            <RefreshCcw className={isLoading ? 'animate-spin' : ''} size={16} />
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-[#f36f4e] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#f36f4e]/20 transition hover:bg-[#dc5f42]"
            onClick={() => setIsAddOpen(true)}
            type="button"
          >
            <Plus size={17} />
            Add EMI
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {isLoading && !plans.length ? (
        <div className="grid min-h-56 place-items-center rounded-lg border border-[#eadfd5] bg-white text-sm text-zinc-500">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="animate-spin" size={17} />
            Loading EMIs...
          </span>
        </div>
      ) : plans.length ? (
        <div className="space-y-3">
          {plans.map((plan) => (
            <EmiPlanRow
              detail={expandedPlan?.id === plan.id ? expandedPlan : null}
              isLoading={loadingPlanId === plan.id}
              key={plan.id}
              onDelete={(installment) => {
                if (!expandedPlan) {
                  return;
                }
                setDeleteScope('single');
                setModalError('');
                setDeleteTarget({ installment, plan: expandedPlan });
              }}
              onEdit={(installment) => setEditingInstallment(installment)}
              onEditMetadata={() => {
                setModalError('');
                setMetadataTarget({
                  id: plan.id,
                  lender: plan.lender ?? '',
                  name: plan.name,
                });
              }}
              onToggle={() => togglePlan(plan.id)}
              plan={plan}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[#eadfd5] bg-white px-5 py-14 text-center shadow-xl shadow-[#dfb49f]/10">
          <div className="mx-auto grid size-12 place-items-center rounded-md bg-[#edf9f7] text-[#287d75]">
            <Landmark size={20} />
          </div>
          <p className="mt-3 text-sm font-bold text-zinc-800">No EMI plans yet</p>
          <button
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#f36f4e] px-3 py-2 text-xs font-bold text-white"
            onClick={() => setIsAddOpen(true)}
            type="button"
          >
            <Plus size={14} />
            Add EMI
          </button>
        </div>
      )}

      {(data?.legacyExpenseCount ?? 0) > 0 ? (
        <section className="border-t border-[#eadfd5] pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-zinc-950">Previous EMI entries</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {data?.legacyExpenseCount} ungrouped record
                {data?.legacyExpenseCount === 1 ? '' : 's'}
              </p>
            </div>
            {legacyExpenses === null ? (
              <button
                className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700"
                disabled={isLoadingLegacy}
                onClick={loadLegacyExpenses}
                type="button"
              >
                {isLoadingLegacy ? <Loader2 className="animate-spin" size={14} /> : null}
                View records
              </button>
            ) : null}
          </div>

          {legacyExpenses !== null ? (
            <LegacyExpenses expenses={legacyExpenses} />
          ) : null}
        </section>
      ) : null}

      <AddExpenseModal
        initialCategoryKey={ExpenseCategoryKey.Emis}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={() => {
          setIsAddOpen(false);
          void loadPlans();
        }}
      />

      <EmiInstallmentModal
        installment={editingInstallment}
        isOpen={Boolean(editingInstallment)}
        onClose={() => setEditingInstallment(null)}
        onSaved={handleDetailChanged}
        plan={expandedPlan}
      />

      <PlanMetadataModal
        error={modalError}
        isSaving={isSavingMetadata}
        onChange={setMetadataTarget}
        onClose={() => setMetadataTarget(null)}
        onSubmit={handleMetadataSubmit}
        target={metadataTarget}
      />

      <EmiDeleteModal
        error={modalError}
        installment={deleteTarget?.installment ?? null}
        isDeleting={isDeleting}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        onScopeChange={setDeleteScope}
        scope={deleteScope}
      />
    </section>
  );
}

interface EmiPlanRowProps {
  detail: EmiPlanDetail | null;
  isLoading: boolean;
  onDelete: (installment: EmiInstallment) => void;
  onEdit: (installment: EmiInstallment) => void;
  onEditMetadata: () => void;
  onToggle: () => void;
  plan: EmiPlanSummary;
}

function EmiPlanRow({
  detail,
  isLoading,
  onDelete,
  onEdit,
  onEditMetadata,
  onToggle,
  plan,
}: EmiPlanRowProps) {
  const progress = plan.installmentCount
    ? Math.round((plan.paidInstallments / plan.installmentCount) * 100)
    : 0;

  return (
    <article className="overflow-hidden rounded-lg border border-[#eadfd5] bg-white shadow-lg shadow-[#dfb49f]/10">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#edf9f7] text-[#287d75]">
              <Landmark size={19} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-bold text-zinc-950">{plan.name}</h3>
                <StatusBadge status={plan.status} />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {plan.lender || 'No lender'} · {formatDate(plan.startDate)} to{' '}
                {formatDate(plan.endDate)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 xl:min-w-[620px]">
            <Summary label="Monthly" value={formatInr(plan.currentMonthlyPaise)} />
            <Summary
              label="Paid"
              value={`${formatInr(plan.paidPaise)} · ${plan.paidInstallments} mo`}
              valueClass="text-emerald-700"
            />
            <Summary
              label="Remaining"
              value={`${formatInr(plan.remainingPaise)} · ${plan.remainingInstallments} mo`}
              valueClass="text-[#b1462d]"
            />
            <Summary
              label="Next"
              value={plan.nextPaymentDate ? formatDate(plan.nextPaymentDate) : 'Complete'}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-[#66bfb6] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-bold text-zinc-500">{progress}%</span>
          <button
            aria-label={`Edit ${plan.name}`}
            className="grid size-8 place-items-center rounded-md border border-zinc-200 text-zinc-500 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e]"
            onClick={onEditMetadata}
            title="Edit EMI name"
            type="button"
          >
            <Pencil size={14} />
          </button>
          <button
            aria-label={detail ? 'Hide installments' : 'View installments'}
            className="grid size-8 place-items-center rounded-md border border-zinc-200 text-zinc-500 transition hover:border-[#66bfb6] hover:text-[#287d75]"
            disabled={isLoading}
            onClick={onToggle}
            title={detail ? 'Hide installments' : 'View installments'}
            type="button"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : detail ? (
              <ChevronUp size={15} />
            ) : (
              <ChevronDown size={15} />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {detail ? (
          <motion.div
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden border-t border-[#eadfd5]"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
          >
            <InstallmentTable
              installments={detail.installments}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}

function InstallmentTable({
  installments,
  onDelete,
  onEdit,
}: {
  installments: EmiInstallment[];
  onDelete: (installment: EmiInstallment) => void;
  onEdit: (installment: EmiInstallment) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead className="bg-[#fbfaf7] text-[10px] uppercase text-zinc-400">
          <tr>
            <th className="px-5 py-3 font-bold">Month</th>
            <th className="px-5 py-3 font-bold">Amount</th>
            <th className="px-5 py-3 font-bold">Status</th>
            <th className="px-5 py-3 font-bold">Tags</th>
            <th className="px-5 py-3 font-bold">Note</th>
            <th className="px-5 py-3 text-right font-bold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1e8df]">
          {installments.length ? (
            installments.map((installment) => (
              <tr className="hover:bg-[#fffaf6]" key={installment.id}>
                <td className="px-5 py-3">
                  <p className="font-bold text-zinc-800">{formatMonth(installment.date)}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    {installment.installmentNumber} / {installment.installmentCount}
                  </p>
                </td>
                <td className="px-5 py-3 font-bold text-zinc-950">
                  {formatInr(installment.amountPaise)}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={[
                      'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold leading-none',
                      installment.isPaid
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700',
                    ].join(' ')}
                  >
                    {installment.isPaid ? <CheckCircle2 size={11} /> : <CalendarClock size={11} />}
                    {installment.isPaid ? 'Paid' : 'Upcoming'}
                  </span>
                </td>
                <td className="max-w-[160px] px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {installment.tags.slice(0, 2).map((tag) => (
                      <span
                        className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-bold leading-none text-zinc-600"
                        key={tag.id}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {installment.tags.length > 2 ? (
                      <span className="text-[10px] font-bold text-zinc-400">
                        +{installment.tags.length - 2}
                      </span>
                    ) : null}
                    {!installment.tags.length ? <span className="text-zinc-300">-</span> : null}
                  </div>
                </td>
                <td className="max-w-[180px] px-5 py-3">
                  <p className="truncate text-xs text-zinc-500" title={installment.note ?? ''}>
                    {installment.note || '-'}
                  </p>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      aria-label="Edit installment"
                      className="grid size-8 place-items-center rounded-md border border-zinc-200 text-zinc-500 transition hover:border-[#66bfb6] hover:text-[#287d75]"
                      onClick={() => onEdit(installment)}
                      title="Edit installment"
                      type="button"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      aria-label="Delete installment"
                      className="grid size-8 place-items-center rounded-md border border-rose-100 bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                      onClick={() => onDelete(installment)}
                      title="Delete installment"
                      type="button"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-5 py-8 text-center text-sm text-zinc-500" colSpan={6}>
                No installments remain.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LegacyExpenses({ expenses }: { expenses: ExpenseItem[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-[#eadfd5] bg-white">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="bg-[#fbfaf7] text-[10px] uppercase text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-bold">Date</th>
            <th className="px-4 py-3 font-bold">Amount</th>
            <th className="px-4 py-3 font-bold">Tags</th>
            <th className="px-4 py-3 font-bold">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1e8df]">
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td className="px-4 py-3 font-semibold text-zinc-700">{formatDate(expense.date)}</td>
              <td className="px-4 py-3 font-bold text-zinc-950">{formatInr(expense.amountPaise)}</td>
              <td className="px-4 py-3 text-xs text-zinc-500">
                {expense.tags.map((tag) => tag.name).join(', ') || '-'}
              </td>
              <td className="max-w-[260px] px-4 py-3 text-xs text-zinc-500">
                <p className="truncate">{expense.note || '-'}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanMetadataModal({
  error,
  isSaving,
  onChange,
  onClose,
  onSubmit,
  target,
}: {
  error: string;
  isSaving: boolean;
  onChange: (target: PlanMetadataTarget | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  target: PlanMetadataTarget | null;
}) {
  return (
    <Modal isOpen={Boolean(target)} onClose={isSaving ? () => undefined : onClose} title="Edit EMI details">
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-xs font-semibold text-zinc-800">EMI name</span>
          <input
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#66bfb6] focus:ring-4 focus:ring-[#66bfb6]/10"
            maxLength={120}
            onChange={(event) =>
              target && onChange({ ...target, name: event.target.value })
            }
            required
            value={target?.name ?? ''}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-zinc-800">Lender</span>
          <input
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#66bfb6] focus:ring-4 focus:ring-[#66bfb6]/10"
            maxLength={120}
            onChange={(event) =>
              target && onChange({ ...target, lender: event.target.value })
            }
            value={target?.lender ?? ''}
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
            className="inline-flex items-center gap-1.5 rounded-md bg-[#66bfb6] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Pencil size={14} />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Summary({
  label,
  value,
  valueClass = 'text-zinc-900',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase text-zinc-400">{label}</p>
      <p className={`mt-1 truncate text-xs font-bold ${valueClass}`} title={value}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: EmiPlanSummary['status'] }) {
  const style =
    status === 'active'
      ? 'bg-blue-50 text-blue-700'
      : status === 'completed'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-zinc-100 text-zinc-600';

  return (
    <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase leading-none ${style}`}>
      {status}
    </span>
  );
}

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00`));
}

function formatMonth(dateValue: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00`));
}

export default EmisPage;
