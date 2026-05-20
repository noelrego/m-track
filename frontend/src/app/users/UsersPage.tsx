import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  UserRound,
  UserX,
} from 'lucide-react';
import { UserRole } from '../../common';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Modal } from '../../shared/components/Modal';
import { formatLocalDateTime } from '../../shared/utils/date';

enum UserStatus {
  Active = 'active',
  Disabled = 'disabled',
}

interface AdminUserResponse {
  id: string;
  username: string;
  emailId: string;
  firstName: string;
  lastName?: string;
  role: UserRole;
  isRootAdmin: boolean;
  status: UserStatus;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserFormState {
  confirmPassword: string;
  emailId: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  username: string;
}

interface UserPayload {
  emailid: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  role: UserRole;
  username: string;
}

type UserPayloadResult =
  | { error: string; ok: false }
  | { ok: true; payload: UserPayload };

const emptyUserForm: UserFormState = {
  confirmPassword: '',
  emailId: '',
  firstName: '',
  lastName: '',
  password: '',
  role: UserRole.User,
  username: '',
};

function getUserName(user: AdminUserResponse) {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username;
}

function getRoleLabel(role: UserRole) {
  return role === UserRole.Admin ? 'Admin' : 'User';
}

function getStatusLabel(status: UserStatus) {
  return status === UserStatus.Active ? 'Active' : 'Disabled';
}

function sortUsers(users: AdminUserResponse[]) {
  return [...users].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

function UsersPage() {
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserResponse | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    useState<AdminUserResponse | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    loadUsers(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  async function loadUsers(signal?: AbortSignal) {
    setIsLoading(true);
    setPageError('');

    try {
      const response = await apiFetch('/admin/users', { signal });
      const data = await readApiBody(response);

      if (!response.ok) {
        setPageError(getApiErrorMessage(data, 'Unable to load users.'));
        return;
      }

      if (!signal?.aborted) {
        setUsers(sortUsers(Array.isArray(data) ? data : []));
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
    setEditingUser(null);
    setUserForm(emptyUserForm);
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditModal(user: AdminUserResponse) {
    setEditingUser(user);
    setUserForm({
      confirmPassword: '',
      emailId: user.emailId,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      password: '',
      role: user.role,
      username: user.username,
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function closeFormModal() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingUser(null);
    setUserForm(emptyUserForm);
    setFormError('');
  }

  function updateFormField<Field extends keyof UserFormState>(
    field: Field,
    value: UserFormState[Field],
  ) {
    setUserForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function buildUserPayload(): UserPayloadResult {
    const username = userForm.username.trim();
    const emailid = userForm.emailId.trim();
    const firstName = userForm.firstName.trim();
    const lastName = userForm.lastName.trim();
    const password = userForm.password;
    const confirmPassword = userForm.confirmPassword;
    const isEditing = Boolean(editingUser);

    if (!username) {
      return { error: 'Username is required.', ok: false };
    }

    if (!emailid) {
      return { error: 'Email is required.', ok: false };
    }

    if (!isEditing && !password) {
      return { error: 'Password is required.', ok: false };
    }

    if (password || confirmPassword) {
      if (password.length < 8) {
        return {
          error: 'Password must be at least 8 characters.',
          ok: false,
        };
      }

      if (password !== confirmPassword) {
        return { error: 'Password and confirm password must match.', ok: false };
      }
    }

    return {
      ok: true,
      payload: {
        username,
        emailid,
        role: userForm.role,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(password ? { password } : {}),
      },
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const result = buildUserPayload();

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiFetch(
        editingUser ? `/admin/users/${editingUser.id}` : '/admin/users',
        {
          method: editingUser ? 'PATCH' : 'POST',
          body: JSON.stringify(result.payload),
        },
      );
      const data = await readApiBody(response);

      if (!response.ok) {
        setFormError(getApiErrorMessage(data, 'Unable to save user.'));
        return;
      }

      const savedUser = data as AdminUserResponse;

      setUsers((currentUsers) =>
        sortUsers(
          editingUser
            ? currentUsers.map((user) =>
                user.id === savedUser.id ? savedUser : user,
              )
            : [savedUser, ...currentUsers],
        ),
      );
      setIsFormOpen(false);
      setEditingUser(null);
      setUserForm(emptyUserForm);
      setFormError('');
    } catch {
      setFormError('Unable to reach the API. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) {
      return;
    }

    setIsDeactivating(true);
    setPageError('');

    try {
      const response = await apiFetch(
        `/admin/users/${deactivateTarget.id}/deactivate`,
        { method: 'PATCH' },
      );
      const data = await readApiBody(response);

      if (!response.ok) {
        setPageError(getApiErrorMessage(data, 'Unable to deactivate user.'));
        return;
      }

      const updatedUser = data as AdminUserResponse;

      setUsers((currentUsers) =>
        sortUsers(
          currentUsers.map((user) =>
            user.id === updatedUser.id ? updatedUser : user,
          ),
        ),
      );
      setDeactivateTarget(null);
    } catch {
      setPageError('Unable to reach the API. Please try again.');
    } finally {
      setIsDeactivating(false);
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
            User
          </h2>
        </div>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#f36f4e] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#f36f4e]/20 transition hover:bg-[#dc5f42] sm:w-auto"
          onClick={openCreateModal}
          type="button"
        >
          <Plus size={18} />
          Create user
        </button>
      </div>

      <div className="rounded-lg border border-[#eadfd5] bg-[#f7efe8] px-4 py-3 text-sm leading-6 text-zinc-600">
        Create and manage users who can access SpendWise.
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
            <h3 className="text-lg font-bold text-zinc-950">All users</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </p>
          </div>

          <button
            aria-label="Refresh users"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-[#fbfaf7] px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => loadUsers()}
            title="Refresh users"
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
                  Name
                </th>
                <th className="border-b border-[#eadfd5] px-5 py-3 font-bold">
                  Role
                </th>
                <th className="border-b border-[#eadfd5] px-5 py-3 font-bold">
                  Status
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
                  <td className="px-5 py-10 text-center text-zinc-500" colSpan={5}>
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Loading users...
                    </span>
                  </td>
                </tr>
              ) : users.length ? (
                users.map((user) => (
                  <tr className="transition hover:bg-[#fff7f1]" key={user.id}>
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-md bg-[#f7efe8] text-[#f36f4e]">
                          <UserRound size={16} />
                        </span>
                        <span>
                          <span className="block font-semibold text-zinc-950">
                            {getUserName(user)}
                          </span>
                          <span className="mt-1 block text-xs text-zinc-500">
                            @{user.username}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-600">
                      {getRoleLabel(user.role)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          user.status === UserStatus.Active
                            ? 'inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700'
                            : 'inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500'
                        }
                      >
                        {getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-zinc-500">
                      {formatLocalDateTime(user.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          aria-label={`Edit ${getUserName(user)}`}
                          className="grid size-9 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:border-[#f36f4e]/40 hover:text-[#f36f4e] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={user.isRootAdmin}
                          onClick={() => openEditModal(user)}
                          title={user.isRootAdmin ? 'Root admin' : 'Edit user'}
                          type="button"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label={`Deactivate ${getUserName(user)}`}
                          className="grid size-9 place-items-center rounded-md border border-rose-100 bg-rose-50 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            user.isRootAdmin || user.status !== UserStatus.Active
                          }
                          onClick={() => setDeactivateTarget(user)}
                          title={
                            user.isRootAdmin || user.status !== UserStatus.Active
                              ? 'Deactivate unavailable'
                              : 'Deactivate user'
                          }
                          type="button"
                        >
                          <UserX size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-12 text-center" colSpan={5}>
                    <div className="mx-auto grid size-12 place-items-center rounded-md bg-[#f7efe8] text-[#f36f4e]">
                      <UserRound size={20} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-zinc-800">
                      No users yet
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Create your first user to start onboarding.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        description="Assign a role and credentials for this user."
        isOpen={isFormOpen}
        onClose={closeFormModal}
        title={editingUser ? 'Edit user' : 'Create user'}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-800">
                Username
              </span>
              <input
                autoComplete="username"
                className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
                maxLength={40}
                onChange={(event) =>
                  updateFormField('username', event.target.value)
                }
                placeholder="jane.user"
                required
                value={userForm.username}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-800">Role</span>
              <select
                className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
                onChange={(event) =>
                  updateFormField('role', event.target.value as UserRole)
                }
                value={userForm.role}
              >
                <option value={UserRole.User}>User</option>
                <option value={UserRole.Admin}>Admin</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-zinc-800">Email</span>
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
              maxLength={254}
              onChange={(event) => updateFormField('emailId', event.target.value)}
              placeholder="jane@example.com"
              required
              type="email"
              value={userForm.emailId}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-800">
                First name
              </span>
              <input
                autoComplete="given-name"
                className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
                maxLength={80}
                onChange={(event) =>
                  updateFormField('firstName', event.target.value)
                }
                placeholder="Jane"
                value={userForm.firstName}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-800">
                Last name
              </span>
              <input
                autoComplete="family-name"
                className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
                maxLength={80}
                onChange={(event) =>
                  updateFormField('lastName', event.target.value)
                }
                placeholder="User"
                value={userForm.lastName}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-800">
                Password
              </span>
              <input
                autoComplete={editingUser ? 'new-password' : 'new-password'}
                className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
                maxLength={128}
                minLength={editingUser ? undefined : 8}
                onChange={(event) =>
                  updateFormField('password', event.target.value)
                }
                placeholder="Enter password"
                required={!editingUser}
                type="password"
                value={userForm.password}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-800">
                Confirm password
              </span>
              <input
                autoComplete="new-password"
                className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
                maxLength={128}
                minLength={editingUser ? undefined : 8}
                onChange={(event) =>
                  updateFormField('confirmPassword', event.target.value)
                }
                placeholder="Confirm password"
                required={!editingUser}
                type="password"
                value={userForm.confirmPassword}
              />
            </label>
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
              {editingUser ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel="Deactivate user"
        description={
          deactivateTarget
            ? `Deactivate "${getUserName(deactivateTarget)}"?`
            : ''
        }
        isLoading={isDeactivating}
        isOpen={Boolean(deactivateTarget)}
        onClose={() => {
          if (!isDeactivating) {
            setDeactivateTarget(null);
          }
        }}
        onConfirm={handleDeactivate}
        title="Deactivate user?"
      />
    </section>
  );
}

export default UsersPage;
