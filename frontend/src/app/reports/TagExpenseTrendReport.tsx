import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Search, Tags, X } from 'lucide-react';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { getTagTrendColor, TagExpenseLineChart } from './TagExpenseLineChart';
import type {
  MonthlyExpenseWindow,
  MonthlyTagExpenseTrendResponse,
  ReportTagOption,
} from './reports.types';

interface TagExpenseTrendReportProps {
  isLoadingTags: boolean;
  monthWindow: MonthlyExpenseWindow;
  rangeLabel: string;
  tagError: string;
  tags: ReportTagOption[];
}

async function fetchTagTrend(
  path: string,
  signal?: AbortSignal,
): Promise<MonthlyTagExpenseTrendResponse> {
  const response = await apiFetch(path, { signal });
  const data = await readApiBody(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, 'Unable to load tag trend.'));
  }

  return data as MonthlyTagExpenseTrendResponse;
}

export function TagExpenseTrendReport({
  isLoadingTags,
  monthWindow,
  rangeLabel,
  tagError,
  tags,
}: TagExpenseTrendReportProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [report, setReport] =
    useState<MonthlyTagExpenseTrendResponse | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState('');
  const selectedTagQuery = selectedTagIds.join(',');
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

  useEffect(() => {
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
    const query = new URLSearchParams({
      months: String(monthWindow),
      tagIds: selectedTagQuery,
    });

    setReport(null);
    setReportError('');
    setIsLoadingReport(true);

    const timeoutId = window.setTimeout(() => {
      void fetchTagTrend(
        `/report/monthly-expenses/by-tags?${query.toString()}`,
        controller.signal,
      )
        .then((reportData) => {
          if (!controller.signal.aborted) {
            setReport(reportData);
          }
        })
        .catch((requestError: unknown) => {
          if (!controller.signal.aborted) {
            setReportError(
              requestError instanceof Error
                ? requestError.message
                : 'Unable to load tag trend.',
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoadingReport(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [monthWindow, selectedTagQuery]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId],
    );
  }

  return (
    <motion.section
      className="w-full rounded-lg border border-[#eadfd5] bg-white p-5 shadow-xl shadow-[#dfb49f]/15 sm:p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut', delay: 0.12 }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-zinc-950">Tag expense trend</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Compare monthly spending for any combination of tags.
          </p>
        </div>

        <div className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-[#edf8f6] px-3 text-xs font-bold text-[#287d74]">
          <Tags size={14} />
          {selectedTagIds.length} selected · {rangeLabel}
        </div>
      </div>

      <div className="mt-5 border-t border-[#eadfd5] pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search trend tags</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              size={16}
            />
            <input
              className="h-10 w-full rounded-md border border-[#eadfd5] bg-white py-2 pl-9 pr-9 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
              onChange={(event) => setTagSearch(event.target.value)}
              placeholder="Filter tags"
              type="search"
              value={tagSearch}
            />
            {tagSearch ? (
              <button
                aria-label="Clear tag search"
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                onClick={() => setTagSearch('')}
                type="button"
              >
                <X size={14} />
              </button>
            ) : null}
          </label>

          {selectedTagIds.length ? (
            <button
              className="h-9 w-fit rounded-md px-3 text-xs font-bold text-zinc-500 transition hover:bg-[#fbfaf7] hover:text-zinc-950"
              onClick={() => setSelectedTagIds([])}
              type="button"
            >
              Clear selection
            </button>
          ) : null}
        </div>

        {tagError ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {tagError}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {isLoadingTags ? (
            <span className="inline-flex h-8 items-center gap-2 text-sm font-semibold text-zinc-500">
              <Loader2 className="animate-spin" size={15} />
              Loading tags...
            </span>
          ) : null}

          {!isLoadingTags && !visibleTags.length ? (
            <span className="text-sm font-semibold text-zinc-500">
              No tags found.
            </span>
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
                {isSelected ? <Check size={12} /> : <Tags size={12} />}
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-[#eadfd5] pt-5">
        {selectedTags.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#fbfaf7] px-2.5 text-[11px] font-bold text-zinc-700"
                key={tag.id}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: getTagTrendColor(tag.id) }}
                />
                {tag.name}
                <button
                  aria-label={`Remove ${tag.name}`}
                  className="grid size-4 place-items-center rounded-full text-zinc-400 transition hover:bg-white hover:text-zinc-800"
                  onClick={() => toggleTag(tag.id)}
                  type="button"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {!selectedTagIds.length ? (
          <div className="grid h-[300px] place-items-center border-y border-dashed border-[#eadfd5] text-center">
            <div>
              <Tags className="mx-auto text-[#66bfb6]" size={24} />
              <p className="mt-3 text-sm font-bold text-zinc-700">
                Select one or more tags
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Monthly tag lines will appear here.
              </p>
            </div>
          </div>
        ) : null}

        {isLoadingReport ? (
          <div className="grid h-[300px] place-items-center text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Loading tag trend...
            </span>
          </div>
        ) : null}

        {reportError && !isLoadingReport ? (
          <div className="grid h-[300px] place-items-center">
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {reportError}
            </div>
          </div>
        ) : null}

        {report && !isLoadingReport && !reportError ? (
          <TagExpenseLineChart data={report} />
        ) : null}
      </div>
    </motion.section>
  );
}
