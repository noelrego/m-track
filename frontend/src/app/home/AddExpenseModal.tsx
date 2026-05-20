import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Check, Loader2, Plus, Search, X } from 'lucide-react';
import { ExpenseCategoryKey } from '../../common';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { Modal } from '../../shared/components/Modal';
import { parseInrToPaise } from '../../shared/utils/money';
import type { CategoryOption, TagOption } from './home.types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const categoryOrder = [
  ExpenseCategoryKey.Needs,
  ExpenseCategoryKey.Wants,
  ExpenseCategoryKey.Emis,
  ExpenseCategoryKey.Extra,
  ExpenseCategoryKey.Invest,
];

function getTodayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeCategoryOrder(categories: CategoryOption[]) {
  return [...categories].sort(
    (first, second) =>
      categoryOrder.indexOf(first.normalizedName) -
      categoryOrder.indexOf(second.normalizedName),
  );
}

export function AddExpenseModal({
  isOpen,
  onClose,
  onCreated,
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayDateInputValue);
  const [note, setNote] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const controller = new AbortController();

    loadOptions(controller.signal);

    return () => {
      controller.abort();
    };
  }, [isOpen]);

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [selectedTagIds, tags],
  );

  const visibleTags = useMemo(() => {
    const search = tagSearch.trim().toLowerCase();

    return tags
      .filter((tag) => !selectedTagIds.includes(tag.id))
      .filter((tag) => (search ? tag.name.toLowerCase().includes(search) : true))
      .slice(0, 8);
  }, [selectedTagIds, tagSearch, tags]);
  const canCreateTag = useMemo(() => {
    const search = tagSearch.trim().toLowerCase();

    if (!search || visibleTags.length) {
      return false;
    }

    return !tags.some((tag) => tag.name.toLowerCase() === search);
  }, [tagSearch, tags, visibleTags.length]);

  async function loadOptions(signal?: AbortSignal) {
    setIsLoadingOptions(true);
    setError('');

    try {
      const [categoriesResponse, tagsResponse] = await Promise.all([
        apiFetch('/categories', { signal }),
        apiFetch('/tags', { signal }),
      ]);
      const [categoriesData, tagsData] = await Promise.all([
        readApiBody(categoriesResponse),
        readApiBody(tagsResponse),
      ]);

      if (!categoriesResponse.ok) {
        setError(getApiErrorMessage(categoriesData, 'Unable to load categories.'));
        return;
      }

      if (!tagsResponse.ok) {
        setError(getApiErrorMessage(tagsData, 'Unable to load tags.'));
        return;
      }

      if (signal?.aborted) {
        return;
      }

      const categoryOptions = normalizeCategoryOrder(
        Array.isArray(categoriesData) ? categoriesData : [],
      );

      setCategories(categoryOptions);
      setTags(Array.isArray(tagsData) ? tagsData : []);
      setSelectedCategoryId((currentCategoryId) =>
        currentCategoryId || categoryOptions[0]?.id || '',
      );
    } catch {
      if (!signal?.aborted) {
        setError('Unable to reach the API. Please try again.');
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoadingOptions(false);
      }
    }
  }

  function resetForm() {
    setAmount('');
    setDate(getTodayDateInputValue());
    setNote('');
    setTagSearch('');
    setSelectedTagIds([]);
    setError('');
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    resetForm();
    onClose();
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((currentIds) =>
      currentIds.includes(tagId)
        ? currentIds.filter((currentId) => currentId !== tagId)
        : [...currentIds, tagId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const amountPaise = parseInrToPaise(amount);

    if (!amountPaise) {
      setError('Enter a valid amount like 200 or 200.96.');
      return;
    }

    if (!selectedCategoryId) {
      setError('Select a category.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiFetch('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          amountPaise,
          date,
          categoryId: selectedCategoryId,
          tagIds: selectedTagIds,
          note: note.trim() || undefined,
        }),
      });
      const data = await readApiBody(response);

      if (!response.ok) {
        setError(getApiErrorMessage(data, 'Unable to save expense.'));
        return;
      }

      resetForm();
      onCreated();
      onClose();
    } catch {
      setError('Unable to reach the API. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateTag() {
    const name = tagSearch.trim();

    if (!name || isCreatingTag) {
      return;
    }

    setIsCreatingTag(true);
    setError('');

    try {
      const response = await apiFetch('/tags', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      const data = await readApiBody(response);

      if (!response.ok) {
        setError(getApiErrorMessage(data, 'Unable to create tag.'));
        return;
      }

      const createdTag = data as TagOption;

      setTags((currentTags) => [createdTag, ...currentTags]);
      setSelectedTagIds((currentIds) => [...currentIds, createdTag.id]);
      setTagSearch('');
    } catch {
      setError('Unable to reach the API. Please try again.');
    } finally {
      setIsCreatingTag(false);
    }
  }

  return (
    <Modal
      description="Add the spend before it gets fuzzy."
      isOpen={isOpen}
      onClose={closeModal}
      title="Add expense"
    >
      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
          <label className="block">
            <span className="text-xs font-semibold text-zinc-800">Date</span>
            <span className="mt-1.5 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus-within:border-[#f36f4e] focus-within:ring-4 focus-within:ring-[#f36f4e]/10">
              <CalendarDays size={14} className="text-zinc-400" />
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
            <span className="text-xs font-semibold text-zinc-800">Expense</span>
            <input
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="200.96"
              required
              value={amount}
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-zinc-800">Category</span>
            {isLoadingOptions ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Loader2 className="animate-spin" size={12} />
                Loading
              </span>
            ) : null}
          </div>

          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {categories.map((category) => {
              const isSelected = selectedCategoryId === category.id;

              return (
                <button
                  className={[
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none transition',
                    isSelected
                      ? 'border-[#f36f4e] bg-[#f36f4e] text-white shadow-md shadow-[#f36f4e]/20'
                      : 'border-[#eadfd5] bg-white text-zinc-600 hover:border-[#f36f4e]/40 hover:text-[#f36f4e]',
                  ].join(' ')}
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
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
                onChange={(event) => setTagSearch(event.target.value)}
                placeholder="Search tags"
                value={tagSearch}
              />
            </span>
          </label>

          <AnimatePresence>
            {selectedTags.length ? (
              <motion.div
                className="mt-2 flex flex-wrap gap-1.5"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
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
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
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
                Create “{tagSearch.trim()}”
              </button>
            ) : null}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-zinc-800">Note</span>
          <textarea
            className="mt-1.5 min-h-16 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Lunch, cab, quick detail..."
            value={note}
          />
        </label>

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={closeModal}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-[#f36f4e] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#dc5f42] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || isLoadingOptions}
            type="submit"
          >
            {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
            Add expense
          </button>
        </div>
      </form>
    </Modal>
  );
}
