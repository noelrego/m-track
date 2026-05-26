import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronDown, Loader2, TrendingUp } from 'lucide-react';
import { ExpenseCategoryKey } from '../../common';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { formatInr } from '../../shared/utils/money';
import type {
  CurrentYearMonthlyExpenseResponse,
  MonthlyCategoryExpenseTrendResponse,
  MonthlyExpenseWindow,
} from './reports.types';
import { CategoryExpenseLineChart } from './CategoryExpenseLineChart';
import { MonthlyTagReport } from './MonthlyTagReport';
import { YearlyExpenseLineChart } from './YearlyExpenseLineChart';

const monthlyExpenseWindowOptions: {
  label: string;
  value: MonthlyExpenseWindow;
}[] = [
  { label: 'Last 5 months', value: 5 },
  { label: 'Last 8 months', value: 8 },
  { label: 'Last 12 months', value: 12 },
];

async function fetchReport<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await apiFetch(path, { signal });
  const data = await readApiBody(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, 'Unable to load report data.'));
  }

  return data as T;
}

function ReportsPage() {
  const [monthlyExpense, setMonthlyExpense] =
    useState<CurrentYearMonthlyExpenseResponse | null>(null);
  const [categoryExpense, setCategoryExpense] =
    useState<MonthlyCategoryExpenseTrendResponse | null>(null);
  const [selectedMonthWindow, setSelectedMonthWindow] =
    useState<MonthlyExpenseWindow>(5);
  const [selectedCategory, setSelectedCategory] = useState<
    ExpenseCategoryKey | 'all'
  >('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    void loadReports(selectedMonthWindow, controller.signal);

    return () => {
      controller.abort();
    };
  }, [selectedMonthWindow]);

  const selectedWindowLabel =
    monthlyExpenseWindowOptions.find(
      (option) => option.value === selectedMonthWindow,
    )?.label ??
    monthlyExpense?.rangeLabel ??
    'Last 5 months';

  const monthlyTotalPaise = useMemo(
    () =>
      monthlyExpense?.months.reduce(
        (total, month) => total + month.totalPaise,
        0,
      ) ?? 0,
    [monthlyExpense],
  );
  const selectedCategoryTotalPaise = useMemo(() => {
    const visibleCategories =
      categoryExpense?.categories.filter((category) =>
        selectedCategory === 'all'
          ? true
          : category.normalizedName === selectedCategory,
      ) ?? [];

    return visibleCategories.reduce(
      (categoryTotal, category) =>
        categoryTotal +
        category.months.reduce(
          (monthTotal, month) => monthTotal + month.totalPaise,
          0,
        ),
      0,
    );
  }, [categoryExpense, selectedCategory]);

  async function loadReports(
    monthWindow: MonthlyExpenseWindow,
    signal?: AbortSignal,
  ) {
    setIsLoading(true);
    setError('');
    setMonthlyExpense(null);
    setCategoryExpense(null);

    try {
      const [monthlyExpenseData, categoryExpenseData] = await Promise.all([
        fetchReport<CurrentYearMonthlyExpenseResponse>(
          `/report/current-year/monthly-expenses?months=${monthWindow}`,
          signal,
        ),
        fetchReport<MonthlyCategoryExpenseTrendResponse>(
          `/report/monthly-expenses/by-category?months=${monthWindow}`,
          signal,
        ),
      ]);

      if (!signal?.aborted) {
        setMonthlyExpense(monthlyExpenseData);
        setCategoryExpense(categoryExpenseData);
      }
    } catch (requestError) {
      if (!signal?.aborted) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load report data.',
        );
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }

  function handleMonthWindowChange(value: string) {
    const monthWindow = Number(value);
    const isValidWindow = monthlyExpenseWindowOptions.some(
      (option) => option.value === monthWindow,
    );

    if (isValidWindow) {
      setSelectedMonthWindow(monthWindow as MonthlyExpenseWindow);
    }
  }

  function handleCategoryChange(value: string) {
    setSelectedCategory(value as ExpenseCategoryKey | 'all');
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-[#f36f4e]">
            SpendWise
          </p>
          <h2 className="mt-3 text-4xl font-bold text-zinc-950 sm:text-5xl">
            My Reports
          </h2>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-zinc-600 shadow-lg shadow-[#dfb49f]/15">
          <CalendarDays size={14} />
          {selectedWindowLabel}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <motion.section
        className="w-full rounded-lg border border-[#eadfd5] bg-white p-5 shadow-xl shadow-[#dfb49f]/15 sm:p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-zinc-950">
              Monthly expense trend
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Total spending across all categories for the selected window.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative inline-flex">
              <span className="sr-only">Monthly expense range</span>
              <select
                aria-label="Monthly expense range"
                className="h-9 appearance-none rounded-md border border-[#eadfd5] bg-white px-3 py-2 pr-8 text-xs font-bold text-zinc-700 outline-none transition hover:border-[#f36f4e]/40 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
                onChange={(event) =>
                  handleMonthWindowChange(event.target.value)
                }
                value={selectedMonthWindow}
              >
                {monthlyExpenseWindowOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"
                size={14}
              />
            </label>

            <div className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-[#fff0eb] px-3 py-2 text-sm font-bold text-[#b1462d]">
              <TrendingUp size={16} />
              {formatInr(monthlyTotalPaise)}
            </div>
          </div>
        </div>

        {isLoading && !monthlyExpense ? (
          <div className="mt-5 grid h-[260px] place-items-center rounded-lg bg-[#fbfaf7] text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Loading trend...
            </span>
          </div>
        ) : (
          <div className="mt-5">
            <YearlyExpenseLineChart data={monthlyExpense} />
          </div>
        )}
      </motion.section>

      <motion.section
        className="w-full rounded-lg border border-[#eadfd5] bg-white p-5 shadow-xl shadow-[#dfb49f]/15 sm:p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut', delay: 0.04 }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-zinc-950">
              Category expense trend
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Monthly spending split by category for the selected window.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative inline-flex">
              <span className="sr-only">Category filter</span>
              <select
                aria-label="Category filter"
                className="h-9 appearance-none rounded-md border border-[#eadfd5] bg-white px-3 py-2 pr-8 text-xs font-bold text-zinc-700 outline-none transition hover:border-[#f36f4e]/40 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
                onChange={(event) => handleCategoryChange(event.target.value)}
                value={selectedCategory}
              >
                <option value="all">All categories</option>
                {categoryExpense?.categories.map((category) => (
                  <option
                    key={category.normalizedName}
                    value={category.normalizedName}
                  >
                    {category.categoryName}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"
                size={14}
              />
            </label>

            <div className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-[#f1effb] px-3 py-2 text-sm font-bold text-[#5944a1]">
              <TrendingUp size={16} />
              {formatInr(selectedCategoryTotalPaise)}
            </div>
          </div>
        </div>

        {isLoading && !categoryExpense ? (
          <div className="mt-5 grid h-[260px] place-items-center rounded-lg bg-[#fbfaf7] text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Loading category trend...
            </span>
          </div>
        ) : (
          <div className="mt-5">
            <CategoryExpenseLineChart
              data={categoryExpense}
              selectedCategory={selectedCategory}
            />
          </div>
        )}
      </motion.section>

      <MonthlyTagReport />
    </section>
  );
}

export default ReportsPage;
