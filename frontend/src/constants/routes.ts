export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  REPOSITORIES: '/repositories',
  REPOSITORY_DETAILS: (id: string) => `/repositories/${id}`,
  SCANS: '/scans',
  SCAN_DETAILS: (id: string) => `/scans/${id}`,
  VULNERABILITIES: '/vulnerabilities',
  VULNERABILITY_DETAILS: (id: string) => `/vulnerabilities/${id}`,
  SETTINGS: '/settings',
} as const;
