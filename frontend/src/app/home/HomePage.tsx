import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { ExpenseCategoryKey } from '../../common';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { formatInr } from '../../shared/utils/money';
import { AddExpenseModal } from './AddExpenseModal';
import type {
  CurrentMonthCategoryCardsResponse,
  CurrentMonthTopExpensesResponse,
  CurrentMonthWeeklyReportResponse,
  ReportCategoryAmount,
  ReportInsight,
  ReportInsightsResponse,
} from './home.types';
import { WeeklyExpenseChart } from './WeeklyExpenseChart';

interface DashboardData {
  categoryCards: CurrentMonthCategoryCardsResponse | null;
  insights: ReportInsightsResponse | null;
  topExpenses: CurrentMonthTopExpensesResponse | null;
  weekly: CurrentMonthWeeklyReportResponse | null;
}

const emptyDashboardData: DashboardData = {
  categoryCards: null,
  insights: null,
  topExpenses: null,
  weekly: null,
};

const categoryStyles: Record<
  ExpenseCategoryKey,
  { accent: string; bg: string; label: string; text: string }
> = {
  [ExpenseCategoryKey.Needs]: {
    accent: 'bg-[#66bfb6]',
    bg: 'bg-[#edf9f7]',
    label: 'Needs',
    text: 'text-[#287d75]',
  },
  [ExpenseCategoryKey.Wants]: {
    accent: 'bg-[#f5b33d]',
    bg: 'bg-[#fff7df]',
    label: 'Wants',
    text: 'text-[#9a6510]',
  },
  [ExpenseCategoryKey.Emis]: {
    accent: 'bg-[#8d78d6]',
    bg: 'bg-[#f1effb]',
    label: 'EMIs',
    text: 'text-[#5944a1]',
  },
  [ExpenseCategoryKey.Extra]: {
    accent: 'bg-[#f36f4e]',
    bg: 'bg-[#fff0eb]',
    label: 'Extra',
    text: 'text-[#b1462d]',
  },
  [ExpenseCategoryKey.Invest]: {
    accent: 'bg-[#242424]',
    bg: 'bg-[#f1f1f0]',
    label: 'Invest',
    text: 'text-zinc-800',
  },
};

async function fetchApi<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await apiFetch(path, { signal });
  const data = await readApiBody(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, 'Unable to load dashboard data.'));
  }

  return data as T;
}

function HomePage() {
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(emptyDashboardData);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    loadDashboard(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  const insights = useMemo(
    () =>
      dashboardData.insights
        ? [
            dashboardData.insights.lastMonthAllExpense,
            dashboardData.insights.currentMonthAllExpense,
            dashboardData.insights.currentMonthNeedsWants,
          ]
        : [],
    [dashboardData.insights],
  );

  async function loadDashboard(signal?: AbortSignal) {
    setIsLoading(true);
    setError('');

    try {
      const [insightsData, categoryCardsData, weeklyData, topExpensesData] =
        await Promise.all([
          fetchApi<ReportInsightsResponse>('/report/insights', signal),
          fetchApi<CurrentMonthCategoryCardsResponse>(
            '/report/current-month/categories',
            signal,
          ),
          fetchApi<CurrentMonthWeeklyReportResponse>(
            '/report/current-month/weekly',
            signal,
          ),
          fetchApi<CurrentMonthTopExpensesResponse>(
            '/report/current-month/top-expenses',
            signal,
          ),
        ]);

      if (!signal?.aborted) {
        setDashboardData({
          categoryCards: categoryCardsData,
          insights: insightsData,
          topExpenses: topExpensesData,
          weekly: weeklyData,
        });
      }
    } catch (requestError) {
      if (!signal?.aborted) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load dashboard data.',
        );
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }

  function handleExpenseCreated() {
    void loadDashboard();
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-7 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="order-2 xl:order-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-[#f36f4e]">
                SpendWise
              </p>
              <h2 className="mt-3 text-4xl font-bold text-zinc-950 sm:text-5xl">
                Dashboard
              </h2>
            </div>

            <button
              className="inline-flex w-fit items-center gap-2 rounded-md border border-[#eadfd5] bg-white px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              onClick={() => loadDashboard()}
              type="button"
            >
              <RefreshCcw
                className={isLoading ? 'animate-spin' : ''}
                size={16}
              />
              Refresh
            </button>
          </div>

          {error ? (
            <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            {isLoading && !insights.length
              ? [0, 1, 2].map((item) => <InsightSkeleton key={item} />)
              : insights.map((insight, index) => (
                  <InsightCard
                    icon={index === 2 ? TrendingUp : WalletCards}
                    insight={insight}
                    key={insight.key}
                  />
                ))}
          </div>
        </div>

        <motion.div
          className="order-1 relative overflow-hidden rounded-lg border border-[#eadfd5] bg-[#f7efe8] p-6 shadow-xl shadow-[#dfb49f]/15 xl:order-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <div className="absolute right-5 top-5 grid size-12 place-items-center rounded-full bg-white text-[#f36f4e] shadow-lg shadow-[#dfb49f]/20">
            <Sparkles size={20} />
          </div>
          <p className="max-w-[220px] text-sm font-semibold uppercase text-[#f36f4e]">
            Quick action
          </p>
          <h3 className="mt-4 max-w-[260px] text-2xl font-bold leading-tight text-zinc-950">
            Capture the spend while it is fresh
          </h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
            Add today&apos;s expense with category, tags, and note in one flow.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              className="inline-flex h-9 min-w-[112px] items-center justify-center gap-1.5 rounded-md bg-[#f36f4e] px-3 text-xs font-bold text-white shadow-lg shadow-[#f36f4e]/20 transition hover:bg-[#dc5f42]"
              onClick={() => setIsAddExpenseOpen(true)}
              type="button"
            >
              <Plus size={15} />
              Add expense
            </button>
            <Link
              className="inline-flex h-9 min-w-[112px] items-center justify-center gap-1.5 rounded-md border border-[#eadfd5] bg-white px-3 text-xs font-bold text-zinc-600 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e]"
              to="/expenses"
            >
              <ReceiptText size={14} />
              View expenses
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-7 xl:grid-cols-[1.35fr_0.85fr]">
        <section className="rounded-lg border border-[#eadfd5] bg-white p-5 shadow-xl shadow-[#dfb49f]/15 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-zinc-950">Activity</h3>
              <p className="mt-1 text-sm text-zinc-500">
                {dashboardData.weekly?.monthName ?? 'Current month'} weekly spend
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfd5] px-3 py-1.5 text-xs font-semibold text-zinc-500">
              <CalendarDays size={14} />
              Needs · Wants · Extra
            </span>
          </div>

          {isLoading && !dashboardData.weekly ? (
            <div className="mt-6 grid h-[300px] place-items-center rounded-lg bg-[#fbfaf7] text-sm text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Loading chart...
              </span>
            </div>
          ) : (
            <div className="mt-5">
              <WeeklyExpenseChart data={dashboardData.weekly} />
            </div>
          )}
        </section>

        <section className="rounded-lg border border-[#eadfd5] bg-white p-5 shadow-xl shadow-[#dfb49f]/15 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-zinc-950">Top expenses</h3>
              <p className="mt-1 text-sm text-zinc-500">
                {dashboardData.topExpenses?.monthName ?? 'Current month'}
              </p>
            </div>
            <div className="grid size-10 place-items-center rounded-md bg-[#fff0eb] text-[#f36f4e]">
              <ArrowUpRight size={18} />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {isLoading && !dashboardData.topExpenses
              ? [0, 1, 2, 3].map((item) => <ListSkeleton key={item} />)
              : dashboardData.topExpenses?.expenses.length
                ? dashboardData.topExpenses.expenses.map((expense) => (
                    <div
                      className="flex items-center justify-between gap-4"
                      key={expense.id}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f7efe8] text-[#f36f4e]">
                          <ReceiptText size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-zinc-950">
                            {expense.note || expense.category.name}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {expense.category.name} · {expense.date}
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-zinc-950">
                        {formatInr(expense.amountPaise)}
                      </p>
                    </div>
                  ))
                : (
                    <div className="rounded-md bg-[#fbfaf7] px-4 py-8 text-center text-sm text-zinc-500">
                      No top expenses yet.
                    </div>
                  )}
          </div>
        </section>
      </div>

      <section className="rounded-lg bg-[#eaf7f4] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-zinc-950">Monthly totals</h3>
            <p className="mt-1 text-sm text-zinc-600">
              {dashboardData.categoryCards?.monthName ?? 'Current month'} category
              split
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-zinc-600">
            <CircleDollarSign size={14} />
            INR
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {isLoading && !dashboardData.categoryCards
            ? [0, 1, 2, 3, 4].map((item) => <CategorySkeleton key={item} />)
            : getCategoryCards(dashboardData.categoryCards).map((category) => (
                <CategoryTotalCard category={category} key={category.normalizedName} />
              ))}
        </div>
      </section>

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onCreated={handleExpenseCreated}
      />
    </section>
  );
}

function InsightCard({
  icon: Icon,
  insight,
}: {
  icon: typeof WalletCards;
  insight: ReportInsight;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-lg bg-white px-4 py-4 shadow-xl shadow-[#dfb49f]/20">
      <div className="flex min-h-[6.25rem] flex-col justify-between">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <p
            className="min-w-0 truncate whitespace-nowrap text-[11px] font-semibold leading-5 text-zinc-500 2xl:text-xs"
            title={insight.label}
          >
            {insight.label}
          </p>
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#66bfb6] text-white shadow-md shadow-[#66bfb6]/25">
            <Icon size={13} />
          </span>
        </div>
        <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1rem,1.2vw,1.35rem)] font-extrabold leading-none tracking-tight text-zinc-950">
          {formatInr(insight.totalPaise)}
        </p>
      </div>
    </div>
  );
}

function CategoryTotalCard({ category }: { category: ReportCategoryAmount }) {
  const style = categoryStyles[category.normalizedName];

  return (
    <div className="relative overflow-hidden rounded-lg bg-white p-5 shadow-xl shadow-[#8dbbb4]/15">
      <span
        className={`absolute left-5 top-0 h-1.5 w-12 rounded-b-full ${style.accent}`}
      />
      <div
        className={`grid size-10 place-items-center rounded-full ${style.bg} ${style.text}`}
      >
        <WalletCards size={18} />
      </div>
      <p className="mt-5 text-sm font-bold text-zinc-950">{style.label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-950">
        {formatInr(category.totalPaise)}
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        {category.count} {category.count === 1 ? 'expense' : 'expenses'}
      </p>
    </div>
  );
}

function getCategoryCards(data: CurrentMonthCategoryCardsResponse | null) {
  if (data?.categories.length) {
    return data.categories;
  }

  return Object.values(ExpenseCategoryKey).map<ReportCategoryAmount>((categoryKey) => ({
    categoryName: categoryStyles[categoryKey].label,
    count: 0,
    normalizedName: categoryKey,
    totalPaise: 0,
  }));
}

function InsightSkeleton() {
  return (
    <div className="min-w-0 flex-1 rounded-lg bg-white px-4 py-4 shadow-xl shadow-[#dfb49f]/15">
      <div className="flex min-h-[6.25rem] flex-col justify-between">
        <div className="h-4 w-28 animate-pulse rounded-full bg-zinc-200" />
        <div className="h-6 w-32 animate-pulse rounded-full bg-zinc-200" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="size-10 animate-pulse rounded-full bg-zinc-100" />
      <div className="flex-1">
        <div className="h-4 w-32 animate-pulse rounded-full bg-zinc-100" />
        <div className="mt-2 h-3 w-20 animate-pulse rounded-full bg-zinc-100" />
      </div>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="rounded-lg bg-white p-5">
      <div className="size-10 animate-pulse rounded-full bg-zinc-100" />
      <div className="mt-5 h-4 w-20 animate-pulse rounded-full bg-zinc-100" />
      <div className="mt-3 h-8 w-28 animate-pulse rounded-full bg-zinc-100" />
    </div>
  );
}

export default HomePage;
