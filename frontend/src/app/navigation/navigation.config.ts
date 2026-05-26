import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  FolderKanban,
  Home,
  ReceiptText,
  Tags,
  Users,
} from 'lucide-react';
import { UserRole } from '../../common';

export interface NavigationItem {
  icon: LucideIcon;
  label: string;
  path: string;
  roles: UserRole[];
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    icon: Home,
    label: 'Home',
    path: '/home',
    roles: [UserRole.Admin, UserRole.User],
  },
  {
    icon: Tags,
    label: 'Tags',
    path: '/tags',
    roles: [UserRole.Admin, UserRole.User],
  },
  {
    icon: ReceiptText,
    label: 'Expenses',
    path: '/expenses',
    roles: [UserRole.Admin, UserRole.User],
  },
  {
    icon: BarChart3,
    label: 'My Reports',
    path: '/reports',
    roles: [UserRole.Admin, UserRole.User],
  },
  {
    icon: FolderKanban,
    label: 'Categories',
    path: '/categories',
    roles: [UserRole.Admin],
  },
  {
    icon: Users,
    label: 'User',
    path: '/users',
    roles: [UserRole.Admin],
  },
];
