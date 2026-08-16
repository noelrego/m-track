import { useEffect, useState } from 'react';
import {
  animate as animateMotionValue,
  motion,
  useReducedMotion,
} from 'framer-motion';
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
  EmiOverview,
  ReportCategoryAmount,
  ReportInsightsResponse,
} from './home.types';
import { WeeklyExpenseChart } from './WeeklyExpenseChart';

interface DashboardData {
  categoryCards: CurrentMonthCategoryCardsResponse | null;
  emiOverview: EmiOverview | null;
  insights: ReportInsightsResponse | null;
  topExpenses: CurrentMonthTopExpensesResponse | null;
  weekly: CurrentMonthWeeklyReportResponse | null;
}

const emptyDashboardData: DashboardData = {
  categoryCards: null,
  emiOverview: null,
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
  [ExpenseCategoryKey.Rent]: {
    accent: 'bg-[#2f6fed]',
    bg: 'bg-[#edf4ff]',
    label: 'Rent',
    text: 'text-[#1f55b8]',
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

  async function loadDashboard(signal?: AbortSignal) {
    setIsLoading(true);
    setError('');

    try {
      const [
        insightsData,
        categoryCardsData,
        weeklyData,
        topExpensesData,
        emiOverviewData,
      ] =
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
          fetchApi<EmiOverview>('/emis/overview', signal),
        ]);

      if (!signal?.aborted) {
        setDashboardData({
          categoryCards: categoryCardsData,
          emiOverview: emiOverviewData,
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
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-[#f36f4e]">
            SpendWise
          </p>
          <h2 className="mt-3 text-4xl font-bold text-zinc-950 sm:text-5xl">
            Dashboard
          </h2>
        </div>

        <div className="flex flex-nowrap items-center gap-2 sm:flex-wrap">
          <button
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#f36f4e] px-3 text-xs font-bold text-white shadow-lg shadow-[#f36f4e]/20 transition hover:bg-[#dc5f42] sm:rounded-md"
            onClick={() => setIsAddExpenseOpen(true)}
            type="button"
          >
            <Plus size={14} />
            Add expense
          </button>
          <Link
            aria-label="AI Assist"
            className="inline-flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#eadfd5] bg-white text-xs font-bold text-zinc-600 transition hover:border-[#66bfb6]/60 hover:text-[#287d74] sm:h-9 sm:w-auto sm:rounded-md sm:px-3"
            title="AI Assist"
            to="/ai-assist"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">AI Assist</span>
          </Link>
          <Link
            aria-label="Expenses"
            className="inline-flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#eadfd5] bg-white text-xs font-bold text-zinc-600 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e] sm:h-9 sm:w-auto sm:rounded-md sm:px-3"
            title="Expenses"
            to="/expenses"
          >
            <ReceiptText size={14} />
            <span className="hidden sm:inline">Expenses</span>
          </Link>
          <button
            aria-label="Refresh dashboard"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[#eadfd5] bg-white text-zinc-500 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e] disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-md"
            disabled={isLoading}
            onClick={() => loadDashboard()}
            title="Refresh dashboard"
            type="button"
          >
            <RefreshCcw className={isLoading ? 'animate-spin' : ''} size={15} />
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-7 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="order-1 h-full">
          <SpendingSnapshotCard
            data={dashboardData.insights}
            isLoading={isLoading}
          />
        </div>

        <motion.div
          className="order-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <EmiOverviewCard
            data={dashboardData.emiOverview}
            isLoading={isLoading}
          />
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

function SpendingSnapshotCard({
  data,
  isLoading,
}: {
  data: ReportInsightsResponse | null;
  isLoading: boolean;
}) {
  const animationKey = data
    ? [
        data.lastMonthAllExpense.totalPaise,
        data.currentMonthAllExpense.totalPaise,
        data.currentMonthNeedsWants.totalPaise,
      ].join(':')
    : 'loading';
  const animationProgress = useDashboardAnimationProgress(animationKey);

  if (isLoading && !data) {
    return (
      <section className="h-full rounded-lg border border-[#eadfd5] bg-white p-4 shadow-xl shadow-[#dfb49f]/15">
        <div className="h-4 w-32 animate-pulse rounded-full bg-zinc-100" />
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_4.75rem] items-center gap-4 sm:grid-cols-[0.9fr_1.1fr_4.75rem]">
          <div>
            <div className="h-3 w-24 animate-pulse rounded-full bg-zinc-100" />
            <div className="mt-3 h-7 w-28 animate-pulse rounded-full bg-zinc-100" />
          </div>
          <div className="col-span-2 space-y-3 sm:col-span-1">
            <div className="h-2 w-full animate-pulse rounded-full bg-zinc-100" />
            <div className="h-2 w-4/5 animate-pulse rounded-full bg-zinc-100" />
          </div>
          <div className="size-[4.75rem] animate-pulse rounded-full bg-zinc-100" />
        </div>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const previous = data.lastMonthAllExpense;
  const current = data.currentMonthAllExpense;
  const needsWants = data.currentMonthNeedsWants;
  const comparisonMax = Math.max(
    previous.totalPaise,
    current.totalPaise,
    1,
  );
  const currentBarWidth = Math.round(
    (current.totalPaise / comparisonMax) * 100,
  );
  const previousBarWidth = Math.round(
    (previous.totalPaise / comparisonMax) * 100,
  );
  const needsWantsShare = current.totalPaise
    ? Math.min(
        100,
        Math.round((needsWants.totalPaise / current.totalPaise) * 100),
      )
    : 0;
  const monthDifference = current.totalPaise - previous.totalPaise;
  const animatedCurrentTotal = animateNumber(
    current.totalPaise,
    animationProgress,
  );
  const animatedDifference = animateNumber(
    Math.abs(monthDifference),
    animationProgress,
  );
  const needsWantsFill = needsWantsShare * animationProgress;
  const animatedNeedsWantsShare = Math.round(needsWantsFill);
  const comparisonText =
    monthDifference === 0
      ? `Same as ${previous.monthName}`
      : `${formatInr(animatedDifference)} ${
          monthDifference > 0 ? 'more' : 'less'
        } than ${previous.monthName}`;

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="h-full rounded-lg border border-[#eadfd5] bg-white p-4 shadow-xl shadow-[#dfb49f]/15"
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase text-[#f36f4e]">
            Spending snapshot
          </p>
          <h3 className="mt-0.5 text-base font-bold text-zinc-950">
            Monthly comparison
          </h3>
        </div>
        <span className="grid size-8 place-items-center rounded-md bg-[#fff0eb] text-[#f36f4e]">
          <CircleDollarSign size={16} />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_4.75rem] items-center gap-x-4 gap-y-3 sm:grid-cols-[0.9fr_1.1fr_4.75rem]">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-zinc-500">
            {current.monthName} total
          </p>
          <p className="mt-1.5 truncate text-2xl font-extrabold leading-none text-zinc-950">
            {formatInr(animatedCurrentTotal)}
          </p>
          <p
            className="mt-2 truncate text-[9px] font-semibold text-zinc-500"
            title={comparisonText}
          >
            {comparisonText}
          </p>
        </div>

        <div className="order-3 col-span-2 min-w-0 space-y-2.5 sm:order-none sm:col-span-1">
          <SnapshotBar
            color="bg-[#f36f4e]"
            label={current.monthName}
            progress={animationProgress}
            value={current.totalPaise}
            width={currentBarWidth}
          />
          <SnapshotBar
            color="bg-[#66bfb6]"
            label={previous.monthName}
            progress={animationProgress}
            value={previous.totalPaise}
            width={previousBarWidth}
          />
        </div>

        <div className="text-center">
          <div
            aria-label={`${needsWantsShare}% of this month's spending is Needs and Wants`}
            className="grid size-[4.75rem] place-items-center rounded-full"
            role="img"
            style={{
              background: `conic-gradient(#8d78d6 0 ${needsWantsFill}%, #eeeaf8 ${needsWantsFill}% 100%)`,
              opacity: 0.65 + animationProgress * 0.35,
              transform: `scale(${0.86 + animationProgress * 0.14})`,
            }}
          >
            <div className="grid size-[3.75rem] place-items-center rounded-full bg-white">
              <div>
                <p className="text-base font-extrabold leading-none text-zinc-950">
                  {animatedNeedsWantsShare}%
                </p>
                <p className="mt-1 text-[7px] font-bold uppercase text-[#5944a1]">
                  N + W
                </p>
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-[8px] font-semibold text-zinc-500">
            Needs + Wants
          </p>
        </div>
      </div>
    </motion.section>
  );
}

function SnapshotBar({
  color,
  label,
  progress,
  value,
  width,
}: {
  color: string;
  label: string;
  progress: number;
  value: number;
  width: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[8px] font-bold text-zinc-500">
        <span className="truncate">{label}</span>
        <span className="shrink-0">
          {formatInr(animateNumber(value, progress))}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f1eeeb]">
        <span
          className={`block h-full rounded-full ${color}`}
          style={{ width: `${width * progress}%` }}
        />
      </div>
    </div>
  );
}

function useDashboardAnimationProgress(animationKey: string) {
  const shouldReduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(shouldReduceMotion ? 1 : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setProgress(1);
      return;
    }

    setProgress(0);
    const animation = animateMotionValue(0, 1, {
      duration: 2.5,
      ease: 'easeOut',
      onUpdate: setProgress,
    });

    return () => animation.stop();
  }, [animationKey, shouldReduceMotion]);

  return progress;
}

function animateNumber(value: number, progress: number) {
  return Math.round(value * progress);
}

function EmiOverviewCard({
  data,
  isLoading,
}: {
  data: EmiOverview | null;
  isLoading: boolean;
}) {
  const animationKey = data
    ? [
        data.activePlanCount,
        data.paidInstallments,
        data.remainingInstallments,
        data.progressPercent,
        data.monthlyCommitmentPaise,
        data.remainingPaise,
      ].join(':')
    : 'loading';
  const animationProgress = useDashboardAnimationProgress(animationKey);

  if (isLoading && !data) {
    return (
      <section className="h-full rounded-lg border border-[#d8e9e6] bg-white p-4 shadow-xl shadow-[#8dbbb4]/15">
        <div className="h-4 w-28 animate-pulse rounded-full bg-zinc-100" />
        <div className="mt-3 flex items-center gap-4">
          <div className="size-[4.75rem] shrink-0 animate-pulse rounded-full bg-zinc-100" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-full animate-pulse rounded-full bg-zinc-100" />
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-zinc-100" />
          </div>
        </div>
      </section>
    );
  }

  const overview: EmiOverview = data ?? {
    activePlanCount: 0,
    monthlyCommitmentPaise: 0,
    nextPaymentDate: undefined,
    paidInstallments: 0,
    progressPercent: 0,
    remainingInstallments: 0,
    remainingPaise: 0,
  };
  const progress = Math.min(100, Math.max(0, overview.progressPercent));
  const totalInstallments =
    overview.paidInstallments + overview.remainingInstallments;
  const animatedActivePlanCount = animateNumber(
    overview.activePlanCount,
    animationProgress,
  );
  const progressFill = progress * animationProgress;
  const animatedProgress = Math.round(progressFill);
  const animatedMonthlyCommitment = animateNumber(
    overview.monthlyCommitmentPaise,
    animationProgress,
  );
  const animatedRemainingBalance = animateNumber(
    overview.remainingPaise,
    animationProgress,
  );
  const animatedPaidInstallments = animateNumber(
    overview.paidInstallments,
    animationProgress,
  );
  const animatedTotalInstallments = animateNumber(
    totalInstallments,
    animationProgress,
  );

  return (
    <section className="h-full rounded-lg border border-[#d8e9e6] bg-white p-4 shadow-xl shadow-[#8dbbb4]/15">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase text-[#287d75]">
            EMI portfolio
          </p>
          <h3 className="mt-0.5 text-base font-bold text-zinc-950">
            {overview.activePlanCount
              ? `${animatedActivePlanCount} active EMI${
                  animatedActivePlanCount === 1 ? '' : 's'
                }`
              : 'No active EMIs'}
          </h3>
        </div>
        <Link
          aria-label="View EMIs"
          className="grid size-8 shrink-0 place-items-center rounded-md bg-[#edf9f7] text-[#287d75] transition hover:bg-[#dff4f1]"
          title="View EMIs"
          to="/emis"
        >
          <ArrowUpRight size={16} />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-4">
        <div
          aria-label={`${progress}% of active EMI installments complete`}
          className="grid size-[4.75rem] place-items-center rounded-full"
          role="img"
          style={{
            background: `conic-gradient(#66bfb6 0 ${progressFill}%, #e7efed ${progressFill}% 100%)`,
            opacity: 0.65 + animationProgress * 0.35,
            transform: `scale(${0.86 + animationProgress * 0.14})`,
          }}
        >
          <div className="grid size-[3.75rem] place-items-center rounded-full bg-white text-center shadow-inner shadow-[#8dbbb4]/10">
            <div>
              <p className="text-xl font-extrabold leading-none text-zinc-950">
                {animatedProgress}%
              </p>
              <p className="mt-1 text-[8px] font-bold uppercase text-zinc-500">
                Paid
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <dl className="min-w-0 divide-y divide-[#edf1ef]">
            <div className="min-w-0 pb-2">
              <dt className="text-[9px] font-semibold text-zinc-500">
                Monthly commitment
              </dt>
              <dd className="mt-0.5 truncate text-sm font-extrabold text-zinc-950">
                {formatInr(animatedMonthlyCommitment)}
              </dd>
            </div>
            <div className="min-w-0 pt-2">
              <dt className="text-[9px] font-semibold text-zinc-500">
                Remaining balance
              </dt>
              <dd className="mt-0.5 truncate text-sm font-bold text-zinc-900">
                {formatInr(animatedRemainingBalance)}
              </dd>
            </div>
          </dl>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-2 text-[8px] font-bold text-zinc-500">
              <span>Installments paid</span>
              <span>
                {animatedPaidInstallments} of {animatedTotalInstallments}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#e7efed]">
              <span
                className="block h-full rounded-full bg-[#66bfb6]"
                style={{ width: `${progress * animationProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
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
