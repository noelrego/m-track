import type { LoginUser } from '../../common';

export function getDisplayName(user: LoginUser | null): string {
  if (!user) {
    return 'Signed in';
  }

  return `${user.firstName} ${user.lastName ?? ''}`.trim() || user.username;
}

export function getInitials(user: LoginUser | null): string {
  const displayName = getDisplayName(user);
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'SW';
}
