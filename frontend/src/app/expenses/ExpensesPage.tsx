import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { ExpenseCategoryKey } from '../../common';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Modal } from '../../shared/components/Modal';
import {
  formatInr,
  normalizeInrInput,
  parseInrToPaise,
} from '../../shared/utils/money';
import { AddExpenseModal } from '../home/AddExpenseModal';
import type {
  CategoryOption,
  ExpenseItem,
  ExpenseTag,
  ListExpensesResponse,
  TagOption,
} from './expenses.types';
import { EmiDeleteModal } from '../emis/EmiDeleteModal';
import { EmiInstallmentModal } from '../emis/EmiInstallmentModal';
import type {
  EmiEditScope,
  EmiInstallment,
  EmiPlanDetail,
} from '../emis/emi.types';

interface ExpenseFormState {
  amount: string;
  categoryId: string;
  date: string;
  note: string;
  tagSearch: string;
  tagIds: string[];
}

const categoryOrder = [
  ExpenseCategoryKey.Needs,
  ExpenseCategoryKey.Wants,
  ExpenseCategoryKey.Rent,
  ExpenseCategoryKey.Emis,
  ExpenseCategoryKey.Extra,
  ExpenseCategoryKey.Invest,
];
const monthOptions = [
  { label: 'January', value: '01' },
  { label: 'February', value: '02' },
  { label: 'March', value: '03' },
  { label: 'April', value: '04' },
  { label: 'May', value: '05' },
  { label: 'June', value: '06' },
  { label: 'July', value: '07' },
  { label: 'August', value: '08' },
  { label: 'September', value: '09' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];
const pageSizeOptions = [10, 20, 50];

async function fetchApi<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await apiFetch(path, { signal });
  const data = await readApiBody(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, 'Unable to load expenses.'));
  }

  return data as T;
}

function getCurrentMonthKey() {
  const now = new Date();

  return toMonthKey(now.getFullYear(), now.getMonth() + 1);
}

function toMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getDefaultDateForMonth(monthKey: string) {
  const currentMonthKey = getCurrentMonthKey();

  if (monthKey === currentMonthKey) {
    const now = new Date();

    return `${currentMonthKey}-${String(now.getDate()).padStart(2, '0')}`;
  }

  return `${monthKey}-01`;
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getDateLabel(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatAmountInput(amountPaise: number) {
  return (amountPaise / 100).toFixed(2);
}

function normalizeCategoryOrder(categories: CategoryOption[]) {
  return [...categories].sort((first, second) => {
    const firstIndex = first.normalizedName
      ? categoryOrder.indexOf(first.normalizedName)
      : -1;
    const secondIndex = second.normalizedName
      ? categoryOrder.indexOf(second.normalizedName)
      : -1;

    if (firstIndex !== secondIndex) {
      return firstIndex - secondIndex;
    }

    return first.name.localeCompare(second.name);
  });
}

function getEmptyExpenseForm(monthKey: string): ExpenseFormState {
  return {
    amount: '',
    categoryId: '',
    date: getDefaultDateForMonth(monthKey),
    note: '',
    tagSearch: '',
    tagIds: [],
  };
}

function getExpenseForm(expense: ExpenseItem): ExpenseFormState {
  return {
    amount: formatAmountInput(expense.amountPaise),
    categoryId: expense.category.id,
    date: expense.date,
    note: expense.note ?? '',
    tagSearch: '',
    tagIds: expense.tags.map((tag) => tag.id),
  };
}

function ExpensesPage() {
  const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey);
  const [noteSearchInput, setNoteSearchInput] = useState('');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [expensesData, setExpensesData] =
    useState<ListExpensesResponse | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [editingEmiPlan, setEditingEmiPlan] = useState<EmiPlanDetail | null>(null);
  const [editingEmiInstallment, setEditingEmiInstallment] =
    useState<EmiInstallment | null>(null);
  const [loadingEmiExpenseId, setLoadingEmiExpenseId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ExpenseItem | null>(null);
  const [deleteScope, setDeleteScope] = useState<EmiEditScope>('single');
  const [viewingTags, setViewingTags] = useState<ExpenseTag[] | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(() =>
    getEmptyExpenseForm(selectedMonthKey),
  );
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [emiModalError, setEmiModalError] = useState('');

  const selectedYear = Number(selectedMonthKey.slice(0, 4));
  const selectedMonth = selectedMonthKey.slice(5, 7);
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years = Array.from({ length: 10 }, (_, index) => currentYear - index);

    return Array.from(new Set([selectedYear, ...years])).sort(
      (first, second) => second - first,
    );
  }, [currentYear, selectedYear]);
  const expenses = expensesData?.expenses ?? [];
  const totalPages = expensesData?.totalPages ?? 1;
  const total = expensesData?.total ?? 0;
  const visibleStart = total ? (page - 1) * limit + 1 : 0;
  const visibleEnd = total ? Math.min(page * limit, total) : 0;
  const isNoteSearchActive = Boolean(noteSearchQuery);
  const selectedTags = useMemo(
    () => tags.filter((tag) => expenseForm.tagIds.includes(tag.id)),
    [expenseForm.tagIds, tags],
  );
  const visibleTagOptions = useMemo(() => {
    const search = expenseForm.tagSearch.trim().toLowerCase();

    return tags
      .filter((tag) => !expenseForm.tagIds.includes(tag.id))
      .filter((tag) => (search ? tag.name.toLowerCase().includes(search) : true))
      .slice(0, 10);
  }, [expenseForm.tagIds, expenseForm.tagSearch, tags]);
  const canCreateTag = useMemo(() => {
    const search = expenseForm.tagSearch.trim().toLowerCase();

    return (
      Boolean(search) && !tags.some((tag) => tag.name.toLowerCase() === search)
    );
  }, [expenseForm.tagSearch, tags]);

  useEffect(() => {
    const normalizedSearch = noteSearchInput.trim();

    if (normalizedSearch === noteSearchQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNoteSearchQuery(normalizedSearch);
      setPage(1);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [noteSearchInput, noteSearchQuery]);

  useEffect(() => {
    const controller = new AbortController();

    void loadExpenses(controller.signal);

    return () => {
      controller.abort();
    };
  }, [selectedMonthKey, noteSearchQuery, page, limit]);

  async function loadExpenses(signal?: AbortSignal) {
    setIsLoading(true);
    setPageError('');

    try {
      const query = new URLSearchParams({
        limit: String(limit),
        page: String(page),
      });

      if (noteSearchQuery) {
        query.set('note', noteSearchQuery);
      } else {
        query.set('month', selectedMonthKey);
      }
      const data = await fetchApi<ListExpensesResponse>(
        `/expenses?${query.toString()}`,
        signal,
      );

      if (!signal?.aborted) {
        if (page > data.totalPages) {
          setPage(data.totalPages);
          return;
        }

        setExpensesData(data);
      }
    } catch (requestError) {
      if (!signal?.aborted) {
        setPageError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load expenses.',
        );
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }

  async function loadOptions(signal?: AbortSignal, expense?: ExpenseItem | null) {
    setIsLoadingOptions(true);
    setFormError('');

    try {
      const [categoriesData, tagsData] = await Promise.all([
        fetchApi<CategoryOption[]>('/categories', signal),
        fetchApi<TagOption[]>('/tags', signal),
      ]);

      if (signal?.aborted) {
        return;
      }

      const categoryOptions = normalizeCategoryOrder([
        ...categoriesData.filter(
          (category) => category.normalizedName !== ExpenseCategoryKey.Emis,
        ),
        ...(expense &&
        !categoriesData.some((category) => category.id === expense.category.id)
          ? [expense.category]
          : []),
      ]);

      setCategories(categoryOptions);
      setTags(tagsData);
      setExpenseForm((currentForm) => ({
        ...currentForm,
        categoryId:
          currentForm.categoryId || expense?.category.id || categoryOptions[0]?.id || '',
      }));
    } catch (requestError) {
      if (!signal?.aborted) {
        setFormError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load form options.',
        );
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoadingOptions(false);
      }
    }
  }

  function updateMonth(year: number, month: string) {
    setSelectedMonthKey(toMonthKey(year, Number(month)));
    setPage(1);
  }

  function updateLimit(nextLimit: number) {
    setLimit(nextLimit);
    setPage(1);
  }

  function applyNoteSearch() {
    setNoteSearchQuery(noteSearchInput.trim());
    setPage(1);
  }

  function clearNoteSearch() {
    setNoteSearchInput('');
    setNoteSearchQuery('');
    setPage(1);
  }

  function refreshExpenses() {
    const normalizedSearch = noteSearchInput.trim();

    if (normalizedSearch !== noteSearchQuery) {
      applyNoteSearch();
      return;
    }

    void loadExpenses();
  }

  function openCreateModal() {
    setIsAddExpenseOpen(true);
  }

  async function openEditModal(expense: ExpenseItem) {
    if (expense.emiPlanId) {
      setLoadingEmiExpenseId(expense.id);
      setPageError('');

      try {
        const plan = await fetchApi<EmiPlanDetail>(`/emis/${expense.emiPlanId}`);
        const installment = plan.installments.find((item) => item.id === expense.id);

        if (!installment) {
          throw new Error('This EMI installment is no longer available.');
        }

        setEditingEmiPlan(plan);
        setEditingEmiInstallment(installment);
      } catch (requestError) {
        setPageError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load this EMI installment.',
        );
      } finally {
        setLoadingEmiExpenseId('');
      }

      return;
    }

    setEditingExpense(expense);
    setExpenseForm(getExpenseForm(expense));
    setFormError('');
    setIsFormOpen(true);
    void loadOptions(undefined, expense);
  }

  function closeEmiEditModal() {
    setEditingEmiInstallment(null);
    setEditingEmiPlan(null);
  }

  function openDeleteModal(expense: ExpenseItem) {
    setDeleteScope('single');
    setEmiModalError('');
    setDeleteTarget(expense);
  }

  function closeFormModal() {
    if (isSaving || isCreatingTag) {
      return;
    }

    setIsFormOpen(false);
    setEditingExpense(null);
    setExpenseForm(getEmptyExpenseForm(selectedMonthKey));
    setFormError('');
  }

  function updateFormField<Field extends keyof ExpenseFormState>(
    field: Field,
    value: ExpenseFormState[Field],
  ) {
    setExpenseForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function toggleTag(tagId: string) {
    setExpenseForm((currentForm) => ({
      ...currentForm,
      tagIds: currentForm.tagIds.includes(tagId)
        ? currentForm.tagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentForm.tagIds, tagId],
    }));
  }

  async function handleCreateTag() {
    const name = expenseForm.tagSearch.trim();

    if (!name || isCreatingTag) {
      return;
    }

    setIsCreatingTag(true);
    setFormError('');

    try {
      const response = await apiFetch('/tags', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      const data = await readApiBody(response);

      if (!response.ok) {
        setFormError(getApiErrorMessage(data, 'Unable to create tag.'));
        return;
      }

      const createdTag = data as TagOption;

      setTags((currentTags) => [createdTag, ...currentTags]);
      setExpenseForm((currentForm) => ({
        ...currentForm,
        tagIds: [...currentForm.tagIds, createdTag.id],
        tagSearch: '',
      }));
    } catch {
      setFormError('Unable to reach the API. Please try again.');
    } finally {
      setIsCreatingTag(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const amountPaise = parseInrToPaise(expenseForm.amount);

    if (!amountPaise) {
      setFormError('Enter a valid amount like 200 or 200.96.');
      return;
    }

    if (!expenseForm.categoryId && !editingExpense) {
      setFormError('Select a category.');
      return;
    }

    const payload = {
      amountPaise,
      date: expenseForm.date,
      ...(editingExpense?.category.id !== expenseForm.categoryId
        ? { categoryId: expenseForm.categoryId }
        : {}),
      tagIds: expenseForm.tagIds,
      note: expenseForm.note.trim() || undefined,
    };

    setIsSaving(true);

    try {
      const response = await apiFetch(
        editingExpense ? `/expenses/${editingExpense.id}` : '/expenses',
        {
          method: editingExpense ? 'PATCH' : 'POST',
          body: JSON.stringify(
            editingExpense ? payload : { ...payload, categoryId: expenseForm.categoryId },
          ),
        },
      );
      const data = await readApiBody(response);

      if (!response.ok) {
        setFormError(getApiErrorMessage(data, 'Unable to save expense.'));
        return;
      }

      const savedExpense = data as ExpenseItem;

      setIsFormOpen(false);
      setEditingExpense(null);
      setExpenseForm(getEmptyExpenseForm(savedExpense.monthKey));

      if (noteSearchQuery) {
        if (page !== 1) {
          setPage(1);
        } else {
          void loadExpenses();
        }
      } else if (savedExpense.monthKey !== selectedMonthKey || page !== 1) {
        setSelectedMonthKey(savedExpense.monthKey);
        setPage(1);
      } else {
        void loadExpenses();
      }
    } catch {
      setFormError('Unable to reach the API. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setPageError('');
    setEmiModalError('');

    try {
      const isEmiInstallment = Boolean(deleteTarget.emiPlanId);
      const query = new URLSearchParams({ scope: deleteScope });
      const path = isEmiInstallment
        ? `/emis/${deleteTarget.emiPlanId}/installments/${deleteTarget.id}?${query.toString()}`
        : `/expenses/${deleteTarget.id}`;
      const response = await apiFetch(path, { method: 'DELETE' });
      const data = await readApiBody(response);

      if (!response.ok) {
        const message = getApiErrorMessage(
          data,
          isEmiInstallment
            ? 'Unable to delete this EMI installment.'
            : 'Unable to delete expense.',
        );

        if (isEmiInstallment) {
          setEmiModalError(message);
        } else {
          setPageError(message);
        }
        return;
      }

      setDeleteTarget(null);

      if (expenses.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        void loadExpenses();
      }
    } catch {
      const message = 'Unable to reach the API. Please try again.';

      if (deleteTarget.emiPlanId) {
        setEmiModalError(message);
      } else {
        setPageError(message);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <div className="flex items-end justify-between gap-4 xl:block">
          <div>
            <p className="text-sm font-semibold uppercase text-[#f36f4e]">
              SpendWise
            </p>
            <h2 className="mt-3 text-4xl font-bold text-zinc-950 sm:text-5xl">
              Expenses
            </h2>
          </div>

          <button
            aria-label="Add expense"
            className="grid size-11 shrink-0 place-items-center rounded-md bg-[#f36f4e] text-white shadow-lg shadow-[#f36f4e]/20 transition hover:bg-[#dc5f42] xl:hidden"
            onClick={openCreateModal}
            title="Add expense"
            type="button"
          >
            <Plus size={19} />
          </button>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 xl:flex xl:items-center xl:justify-end 2xl:w-auto">
          <label className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-[#eadfd5] bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-lg shadow-[#dfb49f]/10">
            <span className="text-xs uppercase text-zinc-400">Month</span>
            <select
              className="min-w-0 bg-transparent text-sm font-bold text-zinc-900 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isNoteSearchActive}
              onChange={(event) => updateMonth(selectedYear, event.target.value)}
              value={selectedMonth}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-[#eadfd5] bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-lg shadow-[#dfb49f]/10">
            <span className="text-xs uppercase text-zinc-400">Year</span>
            <select
              className="min-w-0 bg-transparent text-sm font-bold text-zinc-900 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isNoteSearchActive}
              onChange={(event) =>
                updateMonth(Number(event.target.value), selectedMonth)
              }
              value={selectedYear}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <div className="col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] gap-2 xl:col-span-1 xl:w-[320px] 2xl:w-[360px]">
            <label className="relative block min-w-0">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                size={16}
              />
              <input
                aria-label="Search expense notes"
                className="h-11 w-full rounded-md border border-[#eadfd5] bg-white pl-10 pr-10 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-2 focus:ring-[#f36f4e]/10"
                inputMode="search"
                maxLength={100}
                onChange={(event) => setNoteSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyNoteSearch();
                  }
                }}
                placeholder="Search notes across all months"
                type="text"
                value={noteSearchInput}
              />
              {noteSearchInput ? (
                <button
                  aria-label="Clear note search"
                  className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  onClick={clearNoteSearch}
                  title="Clear note search"
                  type="button"
                >
                  <X size={15} />
                </button>
              ) : null}
            </label>

            <button
              aria-label="Refresh expenses"
              className="grid size-11 place-items-center rounded-md border border-[#eadfd5] bg-white text-zinc-600 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              onClick={refreshExpenses}
              title="Refresh expenses"
              type="button"
            >
              <RefreshCcw
                className={isLoading ? 'animate-spin' : ''}
                size={16}
              />
            </button>
          </div>

          <button
            className="hidden h-11 items-center justify-center gap-2 rounded-md bg-[#f36f4e] px-4 text-sm font-bold text-white shadow-lg shadow-[#f36f4e]/20 transition hover:bg-[#dc5f42] xl:inline-flex"
            onClick={openCreateModal}
            type="button"
          >
            <Plus size={17} />
            Add expense
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-[#eadfd5] bg-[#f7efe8] px-4 py-3 text-sm leading-6 text-zinc-600">
        {isNoteSearchActive ? (
          <>
            Searching expense notes across all months for{' '}
            <strong className="font-bold text-zinc-800">
              &quot;{noteSearchQuery}&quot;
            </strong>
            . Clear the search to return to {getMonthLabel(selectedMonthKey)}.
          </>
        ) : (
          <>
            Showing expenses only for {getMonthLabel(selectedMonthKey)}. Change
            the month or year to edit older entries.
          </>
        )}
      </div>

      <AnimatePresence>
        {pageError ? (
          <motion.div
            className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {pageError}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="overflow-hidden rounded-lg border border-[#eadfd5] bg-white shadow-xl shadow-[#dfb49f]/15">
        <div className="flex flex-col gap-3 border-b border-[#eadfd5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-950">
              {isNoteSearchActive
                ? 'Note search results'
                : getMonthLabel(selectedMonthKey)}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {total} {total === 1 ? 'expense' : 'expenses'}
            </p>
          </div>

          <label className="flex w-fit items-center gap-2 rounded-md border border-zinc-200 bg-[#fbfaf7] px-3 py-2 text-sm font-semibold text-zinc-700">
            Rows
            <select
              className="bg-transparent font-bold outline-none"
              onChange={(event) => updateLimit(Number(event.target.value))}
              value={limit}
            >
              {pageSizeOptions.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[860px] w-full border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-10 bg-[#fbfaf7] text-xs uppercase text-zinc-400">
              <tr>
                <th className="w-20 border-b border-[#eadfd5] px-5 py-3 font-bold">
                  Sl No
                </th>
                <th className="border-b border-[#eadfd5] px-5 py-3 font-bold">
                  Expense
                </th>
                <th className="border-b border-[#eadfd5] px-5 py-3 font-bold">
                  Tags
                </th>
                <th className="border-b border-[#eadfd5] px-5 py-3 font-bold">
                  Notes
                </th>
                <th className="border-b border-[#eadfd5] px-5 py-3 text-right font-bold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1e8df] text-sm">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-zinc-500" colSpan={5}>
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Loading expenses...
                    </span>
                  </td>
                </tr>
              ) : expenses.length ? (
                expenses.map((expense, index) => (
                  <tr
                    className="transition hover:bg-[#fff7f1]"
                    key={expense.id}
                  >
                    <td className="px-5 py-4 text-sm font-bold text-zinc-400">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-3">
                        <span
                          className={[
                            'grid size-10 place-items-center rounded-md',
                            expense.emiPlanId
                              ? 'bg-[#edf9f7] text-[#287d75]'
                              : 'bg-[#fff0eb] text-[#f36f4e]',
                          ].join(' ')}
                        >
                          {expense.emiPlanId ? (
                            <Landmark size={17} />
                          ) : (
                            <ReceiptText size={17} />
                          )}
                        </span>
                        <div>
                          <p className="text-lg font-bold leading-none text-zinc-950">
                            {formatInr(expense.amountPaise)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-zinc-500">
                            <span>
                              {expense.category.name} • {getDateLabel(expense.date)}
                            </span>
                            {expense.emiPlanId ? (
                              <span className="inline-flex h-5 items-center rounded-full bg-[#dff4f1] px-2 text-[9px] font-bold uppercase leading-none text-[#287d75]">
                                EMI {expense.emiInstallmentNumber ?? '-'} /{' '}
                                {expense.emiInstallmentCount ?? '-'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <ExpenseTags tags={expense.tags} onViewAll={setViewingTags} />
                    </td>
                    <td className="max-w-[220px] px-5 py-4">
                      <p
                        className="truncate text-xs leading-5 text-zinc-500"
                        title={expense.note ?? ''}
                      >
                        {expense.note || '-'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          aria-label={
                            expense.emiPlanId ? 'Edit EMI installment' : 'Edit expense'
                          }
                          className="grid size-9 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e]"
                          disabled={loadingEmiExpenseId === expense.id}
                          onClick={() => openEditModal(expense)}
                          title={
                            expense.emiPlanId ? 'Edit EMI installment' : 'Edit expense'
                          }
                          type="button"
                        >
                          {loadingEmiExpenseId === expense.id ? (
                            <Loader2 className="animate-spin" size={15} />
                          ) : (
                            <Pencil size={15} />
                          )}
                        </button>
                        <button
                          aria-label={
                            expense.emiPlanId
                              ? 'Delete EMI installment'
                              : 'Delete expense'
                          }
                          className="grid size-9 place-items-center rounded-md border border-rose-100 bg-rose-50 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100"
                          onClick={() => openDeleteModal(expense)}
                          title={
                            expense.emiPlanId
                              ? 'Delete EMI installment'
                              : 'Delete expense'
                          }
                          type="button"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-14 text-center" colSpan={5}>
                    <div className="mx-auto grid size-12 place-items-center rounded-md bg-[#f7efe8] text-[#f36f4e]">
                      <ReceiptText size={20} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-zinc-800">
                      {isNoteSearchActive
                        ? `No notes match "${noteSearchQuery}"`
                        : `No expenses for ${getMonthLabel(selectedMonthKey)}`}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {isNoteSearchActive
                        ? 'Try a different note or clear the search.'
                        : 'Pick another month or add an expense here.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#eadfd5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            Showing {visibleStart}-{visibleEnd} of {total}
          </p>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-[#fbfaf7] px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || page <= 1}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              type="button"
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <span className="rounded-md bg-[#f7efe8] px-3 py-2 text-sm font-bold text-zinc-700">
              {page} / {totalPages}
            </span>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-[#fbfaf7] px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || page >= totalPages}
              onClick={() =>
                setPage((currentPage) => Math.min(totalPages, currentPage + 1))
              }
              type="button"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <AddExpenseModal
        initialDate={getDefaultDateForMonth(selectedMonthKey)}
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onCreated={() => {
          setIsAddExpenseOpen(false);
          setPage(1);
          void loadExpenses();
        }}
      />

      <EmiInstallmentModal
        installment={editingEmiInstallment}
        isOpen={Boolean(editingEmiInstallment)}
        onClose={closeEmiEditModal}
        onSaved={() => {
          closeEmiEditModal();
          void loadExpenses();
        }}
        plan={editingEmiPlan}
      />

      <Modal
        description="Update amount, date, category, tags, or note."
        isOpen={isFormOpen}
        onClose={closeFormModal}
        title="Edit expense"
      >
        <form className="space-y-3.5" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-800">Date</span>
              <span className="mt-1.5 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus-within:border-[#f36f4e] focus-within:ring-4 focus-within:ring-[#f36f4e]/10">
                <CalendarDays size={14} className="text-zinc-400" />
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  onChange={(event) => updateFormField('date', event.target.value)}
                  required
                  type="date"
                  value={expenseForm.date}
                />
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-zinc-800">Expense</span>
              <input
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
                inputMode="decimal"
                onChange={(event) =>
                  updateFormField('amount', normalizeInrInput(event.target.value))
                }
                pattern="\d+(\.\d{0,2})?"
                placeholder="200.96"
                required
                type="text"
                value={expenseForm.amount}
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-zinc-800">
                Category
              </span>
              {isLoadingOptions ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <Loader2 className="animate-spin" size={12} />
                  Loading
                </span>
              ) : null}
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {categories.map((category) => {
                const isSelected = expenseForm.categoryId === category.id;

                return (
                  <button
                    className={[
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none transition',
                      isSelected
                        ? 'border-[#f36f4e] bg-[#f36f4e] text-white shadow-md shadow-[#f36f4e]/20'
                        : 'border-[#eadfd5] bg-white text-zinc-600 hover:border-[#f36f4e]/40 hover:text-[#f36f4e]',
                    ].join(' ')}
                    key={category.id}
                    onClick={() => updateFormField('categoryId', category.id)}
                    type="button"
                  >
                    {isSelected ? <Check size={10} /> : null}
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-800">Tags</span>
              <span className="mt-1.5 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus-within:border-[#f36f4e] focus-within:ring-4 focus-within:ring-[#f36f4e]/10">
                <Search size={14} className="text-zinc-400" />
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-400"
                  onChange={(event) =>
                    updateFormField('tagSearch', event.target.value)
                  }
                  placeholder="Search tags"
                  value={expenseForm.tagSearch}
                />
              </span>
            </label>

            {selectedTags.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <button
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-bold leading-none text-white"
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    type="button"
                  >
                    {tag.name}
                    <X size={9} />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleTagOptions.map((tag) => (
                <button
                  className="rounded-full border border-[#eadfd5] bg-white px-2 py-0.5 text-[10px] font-semibold leading-none text-zinc-600 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e]"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  type="button"
                >
                  {tag.name}
                </button>
              ))}
              {canCreateTag ? (
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-[#f36f4e]/30 bg-[#fff0eb] px-2 py-0.5 text-[10px] font-bold leading-none text-[#f36f4e] transition hover:border-[#f36f4e] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCreatingTag}
                  onClick={handleCreateTag}
                  type="button"
                >
                  {isCreatingTag ? (
                    <Loader2 className="animate-spin" size={10} />
                  ) : (
                    <Plus size={10} />
                  )}
                  Create "{expenseForm.tagSearch.trim()}"
                </button>
              ) : null}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-zinc-800">Note</span>
            <textarea
              className="mt-1.5 min-h-16 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
              maxLength={500}
              onChange={(event) => updateFormField('note', event.target.value)}
              placeholder="Lunch, cab, quick detail..."
              value={expenseForm.note}
            />
          </label>

          {formError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={closeFormModal}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-md bg-[#f36f4e] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#dc5f42] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || isLoadingOptions || isCreatingTag}
              type="submit"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Pencil size={14} />
              )}
              Save changes
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        description="All tags attached to this expense."
        isOpen={Boolean(viewingTags)}
        onClose={() => setViewingTags(null)}
        title="Expense tags"
      >
        <div className="flex flex-wrap gap-2">
          {(viewingTags ?? []).map((tag) => (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white"
              key={tag.id}
            >
              <Tags size={12} />
              {tag.name}
            </span>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        confirmLabel="Delete expense"
        description={
          deleteTarget
            ? `Delete ${formatInr(deleteTarget.amountPaise)} from ${getDateLabel(
                deleteTarget.date,
              )}?`
            : ''
        }
        isLoading={isDeleting}
        isOpen={Boolean(deleteTarget && !deleteTarget.emiPlanId)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleDelete}
        title="Delete expense?"
      />

      <EmiDeleteModal
        error={emiModalError}
        installment={deleteTarget?.emiPlanId ? deleteTarget : null}
        isDeleting={isDeleting}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setEmiModalError('');
          }
        }}
        onConfirm={handleDelete}
        onScopeChange={setDeleteScope}
        scope={deleteScope}
      />
    </section>
  );
}

function ExpenseTags({
  onViewAll,
  tags,
}: {
  onViewAll: (tags: ExpenseTag[]) => void;
  tags: ExpenseTag[];
}) {
  if (!tags.length) {
    return <span className="text-xs text-zinc-400">No tags</span>;
  }

  const visibleTags = tags.slice(0, 3);
  const hiddenCount = tags.length - visibleTags.length;

  return (
    <div className="flex max-w-[260px] flex-wrap gap-1.5">
      {visibleTags.map((tag) => (
        <span
          className="inline-flex h-5 items-center rounded-full bg-[#f7efe8] px-2 text-[10px] font-bold leading-none text-zinc-600"
          key={tag.id}
        >
          {tag.name}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <button
          className="inline-flex h-5 items-center rounded-full border border-[#eadfd5] bg-white px-2 text-[10px] font-bold leading-none text-[#f36f4e] transition hover:border-[#f36f4e]/40"
          onClick={() => onViewAll(tags)}
          type="button"
        >
          +{hiddenCount} more
        </button>
      ) : null}
    </div>
  );
}

export default ExpensesPage;
