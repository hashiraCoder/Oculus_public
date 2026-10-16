import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { WorkspaceRoute } from './WorkspaceRoute';
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton';
import { useAuthStore } from '../features/auth/stores/authStore';
import { useWorkspaceStore } from '../features/workspace/stores/workspaceStore';

const RootRoute = () => {
  const { isAuthenticated } = useAuthStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  
  if (isAuthenticated && activeWorkspaceId) {
    return <Navigate to={`/w/${activeWorkspaceId}`} replace />;
  }
  return <Navigate to="/login" replace />;
};

// Helper to handle both named and default exports from lazy imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyLoad = (importFn: () => Promise<any>, namedExport?: string) =>
  React.lazy(() =>
    importFn().then((module) => ({
      default: namedExport ? module[namedExport] : (module.default ?? Object.values(module)[0]),
    }))
  );

const LoginPage = lazyLoad(() => import('../features/auth/pages/LoginPage'), 'LoginPage');
const RegisterPage = lazyLoad(() => import('../features/auth/pages/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = lazyLoad(() => import('../features/auth/pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyLoad(() => import('../features/auth/pages/ResetPasswordPage'));
const NotFoundPage = lazyLoad(() => import('../features/auth/pages/NotFoundPage'));

const DashboardPage = lazyLoad(() => import('../features/dashboard/pages/DashboardPage'), 'DashboardPage');
const RepositoriesPage = lazyLoad(() => import('../features/repositories/pages/RepositoriesPage'), 'RepositoriesPage');
const RepositoryDetailPage = lazyLoad(() => import('../features/repositories/pages/RepositoryDetailPage'), 'RepositoryDetailPage');
const FindingsPage = lazyLoad(() => import('../features/findings/pages/FindingsPage'));
const ScansPage = lazyLoad(() => import('../features/scans/pages/ScansPage'), 'ScansPage');
const ScanDetailPage = lazyLoad(() => import('../features/scans/pages/ScanDetailPage'), 'ScanDetailPage');
const DevelopersPage = lazyLoad(() => import('../features/developers/pages/DevelopersPage'), 'DevelopersPage');
const AnalyticsPage = lazyLoad(() => import('../features/analytics/pages/AnalyticsPage'), 'AnalyticsPage');
const PlatformHealthPage = lazyLoad(() => import('../features/health/pages/PlatformHealthPage'), 'PlatformHealthPage');
const ActivityPage = lazyLoad(() => import('../features/activity/pages/ActivityPage'), 'ActivityPage');
const NotificationsPage = lazyLoad(() => import('../features/notifications/pages/NotificationsPage'), 'NotificationsPage');
const SettingsPage = lazyLoad(() => import('../features/settings/pages/SettingsPage'), 'SettingsPage');
const AboutPage = lazyLoad(() => import('../features/about/pages/AboutPage'), 'AboutPage');
const EngineControlCenterPage = lazyLoad(() => import('../features/admin/pages/EngineControlCenterPage'));
const CliGuidePage = lazyLoad(() => import('../features/cli/pages/CliGuidePage'), 'CliGuidePage');

const withSuspense = (Component: React.FC) => (
  <Suspense fallback={<LoadingSkeleton />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRoute />,
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: withSuspense(LoginPage) },
      { path: 'register', element: withSuspense(RegisterPage) },
      { path: 'forgot-password', element: withSuspense(ForgotPasswordPage) },
      { path: 'reset-password', element: withSuspense(ResetPasswordPage) },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/w/:workspaceId',
        element: <WorkspaceRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { index: true, element: withSuspense(DashboardPage) },
              { path: 'repositories', element: withSuspense(RepositoriesPage) },
              { path: 'repositories/:repoId', element: withSuspense(RepositoryDetailPage) },
              { path: 'findings', element: withSuspense(FindingsPage) },
              { path: 'scans', element: withSuspense(ScansPage) },
              { path: 'scans/:scanId', element: withSuspense(ScanDetailPage) },
              { path: 'developers', element: withSuspense(DevelopersPage) },
              { path: 'analytics', element: withSuspense(AnalyticsPage) },
              { path: 'activity', element: withSuspense(ActivityPage) },
              { path: 'notifications', element: withSuspense(NotificationsPage) },
              { path: 'settings', element: withSuspense(SettingsPage) },
              { path: 'cli', element: withSuspense(CliGuidePage) },
              { path: 'about', element: withSuspense(AboutPage) },
            ],
          },
        ],
      },
      {
        element: <DashboardLayout />,
        children: [
          { path: '/platform-health', element: withSuspense(PlatformHealthPage) },
          { path: '/admin/engine', element: withSuspense(EngineControlCenterPage) }
        ]
      }
    ],
  },
  {
    element: <DashboardLayout />,
    children: [
      { path: '/cli', element: withSuspense(CliGuidePage) },
    ],
  },
  {
    path: '*',
    element: withSuspense(NotFoundPage),
  },
]);
