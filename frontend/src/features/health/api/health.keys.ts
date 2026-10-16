export const healthKeys = {
  all: () => ['health'] as const,
  system: () => [...healthKeys.all(), 'system'] as const,
  systemInfo: () => [...healthKeys.system(), 'info'] as const,
  readiness: () => [...healthKeys.all(), 'readiness'] as const,
  liveness: () => [...healthKeys.all(), 'liveness'] as const,
};
