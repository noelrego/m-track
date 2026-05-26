import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  ChevronDown,
  IndianRupee,
  Loader2,
  Search,
  Tags,
  X,
} from 'lucide-react';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { formatInr } from '../../shared/utils/money';
import type {
  MonthlyTagExpenseReportResponse,
  ReportTagOption,
} from './reports.types';

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

async function fetchApi<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await apiFetch(path, { signal });
  const data = await readApiBody(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, 'Unable to load tag report.'));
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

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function MonthlyTagReport() {
  const [tags, setTags] = useState<ReportTagOption[]>([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [report, setReport] =
    useState<MonthlyTagExpenseReportResponse | null>(null);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [tagError, setTagError] = useState('');
  const [reportError, setReportError] = useState('');

  const selectedYear = Number(selectedMonthKey.slice(0, 4));
  const selectedMonth = selectedMonthKey.slice(5, 7);
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years = Array.from({ length: 10 }, (_, index) => currentYear - index);

    return Array.from(new Set([selectedYear, ...years])).sort(
      (first, second) => second - first,
    );
  }, [currentYear, selectedYear]);
  const tagsById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags],
  );
  const selectedTags = useMemo(
    () =>
      selectedTagIds
        .map((tagId) => tagsById.get(tagId))
        .filter((tag): tag is ReportTagOption => Boolean(tag)),
    [selectedTagIds, tagsById],
  );
  const visibleTags = useMemo(() => {
    const search = tagSearch.trim().toLowerCase();

    return tags.filter((tag) =>
      search ? tag.name.toLowerCase().includes(search) : true,
    );
  }, [tagSearch, tags]);
  const selectedTagQuery = selectedTagIds.join(',');
  const reportTotal = report?.totalPaise ?? 0;

  useEffect(() => {
    const controller = new AbortController();

    void loadTags(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!tags.length) {
      return;
    }

    const availableTagIds = new Set(tags.map((tag) => tag.id));

    setSelectedTagIds((currentTagIds) =>
      currentTagIds.filter((tagId) => availableTagIds.has(tagId)),
    );
  }, [tags]);

  useEffect(() => {
    if (!selectedTagQuery) {
      setReport(null);
      setReportError('');
      setIsLoadingReport(false);
      return;
    }

    const controller = new AbortController();

    void loadReport(controller.signal);

    return () => {
      controller.abort();
    };
  }, [selectedMonthKey, selectedTagQuery]);

  async function loadTags(signal?: AbortSignal) {
    setIsLoadingTags(true);
    setTagError('');

    try {
      const tagsData = await fetchApi<ReportTagOption[]>('/tags', signal);

      if (!signal?.aborted) {
        setTags(Array.isArray(tagsData) ? tagsData : []);
      }
    } catch (requestError) {
      if (!signal?.aborted) {
        setTagError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load tags.',
        );
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoadingTags(false);
      }
    }
  }

  async function loadReport(signal?: AbortSignal) {
    setIsLoadingReport(true);
    setReportError('');
    setReport(null);

    try {
      const query = new URLSearchParams({
        month: selectedMonthKey,
        tagIds: selectedTagQuery,
      });
      const reportData = await fetchApi<MonthlyTagExpenseReportResponse>(
        `/report/monthly-tags?${query.toString()}`,
        signal,
      );

      if (!signal?.aborted) {
        setReport(reportData);
      }
    } catch (requestError) {
      if (!signal?.aborted) {
        setReportError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load tag report.',
        );
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoadingReport(false);
      }
    }
  }

  function updateMonth(year: number, month: string) {
    setSelectedMonthKey(toMonthKey(year, Number(month)));
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId],
    );
  }

  function removeTag(tagId: string) {
    setSelectedTagIds((currentTagIds) =>
      currentTagIds.filter((currentTagId) => currentTagId !== tagId),
    );
  }

  return (
    <motion.section
      className="w-full rounded-lg border border-[#eadfd5] bg-white p-5 shadow-xl shadow-[#dfb49f]/15 sm:p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut', delay: 0.08 }}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-zinc-950">
            Monthly tag report
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Selected tag spend for one month.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative inline-flex">
            <span className="sr-only">Report month</span>
            <select
              aria-label="Report month"
              className="h-9 appearance-none rounded-md border border-[#eadfd5] bg-white px-3 py-2 pr-8 text-xs font-bold text-zinc-700 outline-none transition hover:border-[#f36f4e]/40 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
              onChange={(event) => updateMonth(selectedYear, event.target.value)}
              value={selectedMonth}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"
              size={14}
            />
          </label>

          <label className="relative inline-flex">
            <span className="sr-only">Report year</span>
            <select
              aria-label="Report year"
              className="h-9 appearance-none rounded-md border border-[#eadfd5] bg-white px-3 py-2 pr-8 text-xs font-bold text-zinc-700 outline-none transition hover:border-[#f36f4e]/40 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
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
            <ChevronDown
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"
              size={14}
            />
          </label>

          <div className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-[#edf8f6] px-3 py-2 text-sm font-bold text-[#287d74]">
            <IndianRupee size={15} />
            {formatInr(reportTotal)}
          </div>
        </div>
      </div>

      {tagError ? (
        <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {tagError}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.7fr)]">
        <div className="space-y-3">
          <label className="relative block">
            <span className="sr-only">Search tags</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              size={16}
            />
            <input
              className="h-10 w-full rounded-md border border-[#eadfd5] bg-white py-2 pl-9 pr-3 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
              onChange={(event) => setTagSearch(event.target.value)}
              placeholder="Search tags"
              type="text"
              value={tagSearch}
            />
          </label>

          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
            {isLoadingTags ? (
              <div className="inline-flex items-center gap-2 rounded-md bg-[#fbfaf7] px-3 py-2 text-sm font-semibold text-zinc-500">
                <Loader2 className="animate-spin" size={15} />
                Loading tags...
              </div>
            ) : null}

            {!isLoadingTags && !visibleTags.length ? (
              <div className="rounded-md bg-[#fbfaf7] px-3 py-2 text-sm font-semibold text-zinc-500">
                No tags found.
              </div>
            ) : null}

            {visibleTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);

              return (
                <button
                  aria-pressed={isSelected}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
                    isSelected
                      ? 'border-[#66bfb6] bg-[#edf8f6] text-[#287d74]'
                      : 'border-[#eadfd5] bg-white text-zinc-600 hover:border-[#f36f4e]/40 hover:text-zinc-950'
                  }`}
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  type="button"
                >
                  <Tags size={13} />
                  {tag.name}
                </button>
              );
            })}
          </div>

          {selectedTags.length ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-[#eadfd5] pt-3">
              {selectedTags.map((tag) => (
                <span
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#fff0eb] px-3 text-xs font-bold text-[#b1462d]"
                  key={tag.id}
                >
                  {tag.name}
                  <button
                    aria-label={`Remove ${tag.name}`}
                    className="grid h-5 w-5 place-items-center rounded-full text-[#b1462d] transition hover:bg-white"
                    onClick={() => removeTag(tag.id)}
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              <button
                className="h-8 rounded-full px-3 text-xs font-bold text-zinc-500 transition hover:bg-[#fbfaf7] hover:text-zinc-950"
                onClick={() => setSelectedTagIds([])}
                type="button"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>

        <div className="rounded-md bg-[#fbfaf7] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-zinc-400">
                {getMonthLabel(selectedMonthKey)}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-600">
                {selectedTags.length} selected{' '}
                {selectedTags.length === 1 ? 'tag' : 'tags'}
              </p>
            </div>

            <CalendarDays className="text-[#f36f4e]" size={20} />
          </div>

          {reportError ? (
            <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {reportError}
            </div>
          ) : null}

          {!selectedTagIds.length ? (
            <div className="mt-4 rounded-md border border-dashed border-[#eadfd5] bg-white px-4 py-6 text-center text-sm font-semibold text-zinc-500">
              Select tags to view month spend.
            </div>
          ) : null}

          {isLoadingReport ? (
            <div className="mt-4 grid h-28 place-items-center rounded-md bg-white text-sm text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Loading tag totals...
              </span>
            </div>
          ) : null}

          {report && !isLoadingReport ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase text-zinc-400">
                  Total
                </p>
                <p className="mt-1 text-3xl font-bold text-zinc-950">
                  {formatInr(report.totalPaise)}
                </p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">
                  {report.count} {report.count === 1 ? 'expense' : 'expenses'}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {report.tags.map((tag) => (
                  <article
                    className="rounded-md border border-[#eadfd5] bg-white px-3 py-3"
                    key={tag.tagId}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-zinc-600">
                        <Tags className="shrink-0 text-[#66bfb6]" size={13} />
                        <span className="truncate">{tag.tagName}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-zinc-400">
                        {tag.count}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-zinc-950">
                      {formatInr(tag.totalPaise)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </motion.section>
  );
}
