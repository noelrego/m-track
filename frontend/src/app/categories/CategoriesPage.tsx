import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FolderKanban,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Modal } from '../../shared/components/Modal';
import { formatLocalDateTime } from '../../shared/utils/date';

interface CategoryResponse {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryFormState {
  description: string;
  isActive: boolean;
  name: string;
  sortOrder: string;
}

interface CategoryPayload {
  description?: string;
  isActive?: boolean;
  name: string;
  sortOrder?: number;
}

type CategoryPayloadResult =
  | { error: string; ok: false }
  | { ok: true; payload: CategoryPayload };

const emptyCategoryForm: CategoryFormState = {
  description: '',
  isActive: true,
  name: '',
  sortOrder: '',
};

function sortCategories(categories: CategoryResponse[]) {
  return [...categories].sort((first, second) => {
    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder;
    }

    return first.name.localeCompare(second.name);
  });
}

function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<CategoryResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryResponse | null>(null);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(emptyCategoryForm);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    loadCategories(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  async function loadCategories(signal?: AbortSignal) {
    setIsLoading(true);
    setPageError('');

    try {
      const response = await apiFetch('/admin/categories', { signal });
      const data = await readApiBody(response);

      if (!response.ok) {
        setPageError(getApiErrorMessage(data, 'Unable to load categories.'));
        return;
      }

      if (!signal?.aborted) {
        setCategories(sortCategories(Array.isArray(data) ? data : []));
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
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditModal(category: CategoryResponse) {
    setEditingCategory(category);
    setCategoryForm({
      description: category.description ?? '',
      isActive: category.isActive,
      name: category.name,
      sortOrder: String(category.sortOrder ?? ''),
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function closeFormModal() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setFormError('');
  }

  function updateFormField<Field extends keyof CategoryFormState>(
    field: Field,
    value: CategoryFormState[Field],
  ) {
    setCategoryForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function buildCategoryPayload(): CategoryPayloadResult {
    const name = categoryForm.name.trim();
    const description = categoryForm.description.trim();
    const sortOrder =
      categoryForm.sortOrder.trim() === ''
        ? undefined
        : Number(categoryForm.sortOrder);

    if (!name) {
      return { error: 'Category name is required.', ok: false };
    }

    if (
      sortOrder !== undefined &&
      (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 1000)
    ) {
      return {
        error: 'Sort order must be a whole number from 0 to 1000.',
        ok: false,
      };
    }

    return {
      ok: true,
      payload: {
        name,
        ...(description ? { description } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(editingCategory ? { isActive: categoryForm.isActive } : {}),
      },
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const result = buildCategoryPayload();

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiFetch(
        editingCategory
          ? `/admin/categories/${editingCategory.id}`
          : '/admin/categories',
        {
          method: editingCategory ? 'PATCH' : 'POST',
          body: JSON.stringify(result.payload),
        },
      );
      const data = await readApiBody(response);

      if (!response.ok) {
        setFormError(getApiErrorMessage(data, 'Unable to save category.'));
        return;
      }

      const savedCategory = data as CategoryResponse;

      setCategories((currentCategories) =>
        sortCategories(
          editingCategory
            ? currentCategories.map((category) =>
                category.id === savedCategory.id ? savedCategory : category,
              )
            : [savedCategory, ...currentCategories],
        ),
      );
      setIsFormOpen(false);
      setEditingCategory(null);
      setCategoryForm(emptyCategoryForm);
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
      const response = await apiFetch(`/admin/categories/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await readApiBody(response);

      if (!response.ok) {
        setPageError(getApiErrorMessage(data, 'Unable to delete category.'));
        return;
      }

      const updatedCategory = data as CategoryResponse;

      setCategories((currentCategories) =>
        sortCategories(
          currentCategories.map((category) =>
            category.id === updatedCategory.id ? updatedCategory : category,
          ),
        ),
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
            Categories
          </h2>
        </div>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#f36f4e] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#f36f4e]/20 transition hover:bg-[#dc5f42] sm:w-auto"
          onClick={openCreateModal}
          type="button"
        >
          <Plus size={18} />
          Create category
        </button>
      </div>

      <div className="rounded-lg border border-[#eadfd5] bg-[#f7efe8] px-4 py-3 text-sm leading-6 text-zinc-600">
        Manage expense categories used in the add expense flow and monthly
        reports.
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
            <h3 className="text-lg font-bold text-zinc-950">All categories</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {categories.length}{' '}
              {categories.length === 1 ? 'category' : 'categories'}
            </p>
          </div>

          <button
            aria-label="Refresh categories"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-[#fbfaf7] px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => loadCategories()}
            title="Refresh categories"
            type="button"
          >
            <RefreshCcw className={isLoading ? 'animate-spin' : ''} size={16} />
            Refresh
          </button>
        </div>

        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-10 bg-[#fbfaf7] text-xs uppercase text-zinc-400">
              <tr>
                <th className="border-b border-[#eadfd5] px-5 py-3 font-bold">
                  Category
                </th>
                <th className="border-b border-[#eadfd5] px-5 py-3 font-bold">
                  Created At
                </th>
                <th className="border-b border-[#eadfd5] px-5 py-3 font-bold">
                  Status
                </th>
                <th className="border-b border-[#eadfd5] px-5 py-3 text-right font-bold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1e8df] text-sm">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-10 text-center text-zinc-500" colSpan={4}>
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Loading categories...
                    </span>
                  </td>
                </tr>
              ) : categories.length ? (
                categories.map((category) => (
                  <tr
                    className="transition hover:bg-[#fff7f1]"
                    key={category.id}
                  >
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-md bg-[#f7efe8] text-[#f36f4e]">
                          <FolderKanban size={16} />
                        </span>
                        <span>
                          <span className="block font-semibold text-zinc-950">
                            {category.name}
                          </span>
                          {category.description ? (
                            <span className="mt-1 block max-w-md truncate text-xs text-zinc-500">
                              {category.description}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-500">
                      {formatLocalDateTime(category.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          category.isActive
                            ? 'inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700'
                            : 'inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500'
                        }
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          aria-label={`Edit ${category.name}`}
                          className="grid size-9 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e]"
                          onClick={() => openEditModal(category)}
                          title="Edit category"
                          type="button"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label={`Delete ${category.name}`}
                          className="grid size-9 place-items-center rounded-md border border-rose-100 bg-rose-50 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!category.isActive}
                          onClick={() => setDeleteTarget(category)}
                          title={
                            category.isActive
                              ? 'Delete category'
                              : 'Category is inactive'
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
                  <td className="px-5 py-12 text-center" colSpan={4}>
                    <div className="mx-auto grid size-12 place-items-center rounded-md bg-[#f7efe8] text-[#f36f4e]">
                      <FolderKanban size={20} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-zinc-800">
                      No categories yet
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Create your first category for expense tracking.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        description="Categories become the main grouping for expenses and reports."
        isOpen={isFormOpen}
        onClose={closeFormModal}
        title={editingCategory ? 'Edit category' : 'Create category'}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-800">
              Category name
            </span>
            <input
              className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
              maxLength={60}
              onChange={(event) => updateFormField('name', event.target.value)}
              placeholder="Needs"
              required
              value={categoryForm.name}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-zinc-800">
              Description
            </span>
            <textarea
              className="mt-2 min-h-24 w-full resize-none rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
              maxLength={240}
              onChange={(event) =>
                updateFormField('description', event.target.value)
              }
              placeholder="Daily essentials like food and groceries"
              value={categoryForm.description}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-800">
                Sort order
              </span>
              <input
                className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
                min={0}
                max={1000}
                onChange={(event) =>
                  updateFormField('sortOrder', event.target.value)
                }
                placeholder="10"
                type="number"
                value={categoryForm.sortOrder}
              />
            </label>

            {editingCategory ? (
              <label className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 bg-white px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold text-zinc-800">
                    Active
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Show in expense forms
                  </span>
                </span>
                <input
                  checked={categoryForm.isActive}
                  className="size-5 accent-[#f36f4e]"
                  onChange={(event) =>
                    updateFormField('isActive', event.target.checked)
                  }
                  type="checkbox"
                />
              </label>
            ) : null}
          </div>

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
              {editingCategory ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel="Delete category"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? It will be marked inactive so old expenses keep their history.`
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
        title="Delete category?"
      />
    </section>
  );
}

export default CategoriesPage;
