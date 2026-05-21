import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Loader2, TrendingUp } from 'lucide-react';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { formatInr } from '../../shared/utils/money';
import type { CurrentYearMonthlyExpenseResponse } from './reports.types';
import { YearlyExpenseLineChart } from './YearlyExpenseLineChart';

async function fetchReport<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await apiFetch(path, { signal });
  const data = await readApiBody(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, 'Unable to load report data.'));
  }

  return data as T;
}

function ReportsPage() {
  const [yearlyExpense, setYearlyExpense] =
    useState<CurrentYearMonthlyExpenseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    void loadReports(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  const yearlyTotalPaise = useMemo(
    () =>
      yearlyExpense?.months.reduce(
        (total, month) => total + month.totalPaise,
        0,
      ) ?? 0,
    [yearlyExpense],
  );

  async function loadReports(signal?: AbortSignal) {
    setIsLoading(true);
    setError('');

    try {
      const yearlyExpenseData =
        await fetchReport<CurrentYearMonthlyExpenseResponse>(
          '/report/current-year/monthly-expenses',
          signal,
        );

      if (!signal?.aborted) {
        setYearlyExpense(yearlyExpenseData);
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

  return (
    <section className="space-y-7">
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
          {yearlyExpense?.year ?? new Date().getFullYear()} yearly view
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
              Total spending across all categories for the current year.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-md bg-[#fff0eb] px-3 py-2 text-sm font-bold text-[#b1462d]">
            <TrendingUp size={16} />
            {formatInr(yearlyTotalPaise)}
          </div>
        </div>

        {isLoading && !yearlyExpense ? (
          <div className="mt-5 grid h-[280px] place-items-center rounded-lg bg-[#fbfaf7] text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Loading yearly trend...
            </span>
          </div>
        ) : (
          <div className="mt-5">
            <YearlyExpenseLineChart data={yearlyExpense} />
          </div>
        )}
      </motion.section>
    </section>
  );
}

export default ReportsPage;
