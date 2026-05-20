import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UserRole } from '../common';
import { ProtectedRoute } from './routing/ProtectedRoute';
import { PublicOnlyRoute } from './routing/PublicOnlyRoute';
import { RoleRoute } from './routing/RoleRoute';

const AppShell = lazy(() => import('./layout/AppShell'));
const LoginPage = lazy(() => import('../public/login/LoginPage'));
const HomePage = lazy(() => import('./home/HomePage'));
const TagsPage = lazy(() => import('./tags/TagsPage'));
const ReportsPage = lazy(() => import('./reports/ReportsPage'));
const CategoriesPage = lazy(() => import('./categories/CategoriesPage'));
const UsersPage = lazy(() => import('./users/UsersPage'));

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route
                path="/categories"
                element={
                  <RoleRoute allowedRoles={[UserRole.Admin]}>
                    <CategoriesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <RoleRoute allowedRoles={[UserRole.Admin]}>
                    <UsersPage />
                  </RoleRoute>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function RouteFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 text-zinc-50">
      <p className="text-sm font-medium text-zinc-400">Loading...</p>
    </main>
  );
}
