import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Pencil, Plus, RefreshCcw, Tags, Trash2 } from 'lucide-react';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Modal } from '../../shared/components/Modal';
import { formatLocalDateTime } from '../../shared/utils/date';

interface TagResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

function TagsPage() {
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagResponse | null>(null);
  const [tagName, setTagName] = useState('');
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    loadTags(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  async function loadTags(signal?: AbortSignal) {
    setIsLoading(true);
    setPageError('');

    try {
      const response = await apiFetch('/tags', { signal });
      const data = await readApiBody(response);

      if (!response.ok) {
        setPageError(getApiErrorMessage(data, 'Unable to load tags.'));
        return;
      }

      if (!signal?.aborted) {
        setTags(Array.isArray(data) ? data : []);
      }
    } catch {
      if (!signal?.aborted) {
        setPageError('Unable to reach the API. Please try again.');
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }

  function openCreateModal() {
    setEditingTag(null);
    setTagName('');
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditModal(tag: TagResponse) {
    setEditingTag(tag);
    setTagName(tag.name);
    setFormError('');
    setIsFormOpen(true);
  }

  function closeFormModal() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingTag(null);
    setTagName('');
    setFormError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const name = tagName.trim();

    if (!name) {
      setFormError('Tag name is required.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiFetch(
        editingTag ? `/tags/${editingTag.id}` : '/tags',
        {
          method: editingTag ? 'PATCH' : 'POST',
          body: JSON.stringify({ name }),
        },
      );
      const data = await readApiBody(response);

      if (!response.ok) {
        setFormError(getApiErrorMessage(data, 'Unable to save tag.'));
        return;
      }

      const savedTag = data as TagResponse;

      setTags((currentTags) =>
        editingTag
          ? currentTags.map((tag) => (tag.id === savedTag.id ? savedTag : tag))
          : [savedTag, ...currentTags],
      );
      setIsFormOpen(false);
      setEditingTag(null);
      setTagName('');
      setFormError('');
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

    try {
      const response = await apiFetch(`/tags/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await readApiBody(response);

      if (!response.ok) {
        setPageError(getApiErrorMessage(data, 'Unable to delete tag.'));
        return;
      }

      setTags((currentTags) =>
        currentTags.filter((tag) => tag.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } catch {
      setPageError('Unable to reach the API. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-[#f36f4e]">
            SpendWise
          </p>
          <h2 className="mt-3 text-4xl font-bold text-zinc-950 sm:text-5xl">
            Tags
          </h2>
        </div>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#f36f4e] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#f36f4e]/20 transition hover:bg-[#dc5f42] sm:w-auto"
          onClick={openCreateModal}
          type="button"
        >
          <Plus size={18} />
          Create tag
        </button>
      </div>

      <div className="rounded-lg border border-[#eadfd5] bg-[#f7efe8] px-4 py-3 text-sm leading-6 text-zinc-600">
        Create and manage tags you can attach while adding expenses.
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
            <h3 className="text-lg font-bold text-zinc-950">All tags</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {tags.length} {tags.length === 1 ? 'tag' : 'tags'}
            </p>
          </div>

          <button
            aria-label="Refresh tags"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-[#fbfaf7] px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => loadTags()}
            title="Refresh tags"
            type="button"
          >
            <RefreshCcw className={isLoading ? 'animate-spin' : ''} size={16} />
            Refresh
          </button>
        </div>

        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-[620px] w-full border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-10 bg-[#fbfaf7] text-xs uppercase text-zinc-400">
              <tr>
                <th className="border-b border-[#eadfd5] px-5 py-3 font-bold">
                  Tags
                </th>
                <th className="border-b border-[#eadfd5] px-5 py-3 font-bold">
                  Created At
                </th>
                <th className="border-b border-[#eadfd5] px-5 py-3 text-right font-bold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1e8df] text-sm">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-10 text-center text-zinc-500" colSpan={3}>
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Loading tags...
                    </span>
                  </td>
                </tr>
              ) : tags.length ? (
                tags.map((tag) => (
                  <tr
                    className="transition hover:bg-[#fff7f1]"
                    key={tag.id}
                  >
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-md bg-[#f7efe8] text-[#f36f4e]">
                          <Tags size={16} />
                        </span>
                        <span className="font-semibold text-zinc-950">
                          {tag.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-500">
                      {formatLocalDateTime(tag.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          aria-label={`Edit ${tag.name}`}
                          className="grid size-9 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e]"
                          onClick={() => openEditModal(tag)}
                          title="Edit tag"
                          type="button"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label={`Delete ${tag.name}`}
                          className="grid size-9 place-items-center rounded-md border border-rose-100 bg-rose-50 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100"
                          onClick={() => setDeleteTarget(tag)}
                          title="Delete tag"
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
                  <td className="px-5 py-12 text-center" colSpan={3}>
                    <div className="mx-auto grid size-12 place-items-center rounded-md bg-[#f7efe8] text-[#f36f4e]">
                      <Tags size={20} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-zinc-800">
                      No tags yet
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Create your first tag to organize expenses.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        description="Use a short label like UPI, Food, Movie, or Clothes."
        isOpen={isFormOpen}
        onClose={closeFormModal}
        title={editingTag ? 'Edit tag' : 'Create tag'}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-800">Tag name</span>
            <input
              className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
              maxLength={40}
              onChange={(event) => setTagName(event.target.value)}
              placeholder="Food"
              required
              value={tagName}
            />
          </label>

          {formError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={closeFormModal}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-[#f36f4e] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#dc5f42] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
              {editingTag ? 'Save changes' : 'Create tag'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel="Delete tag"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? Old expenses will no longer show this tag.`
            : ''
        }
        isLoading={isDeleting}
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleDelete}
        title="Delete tag?"
      />
    </section>
  );
}

export default TagsPage;
