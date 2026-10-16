import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';

// Create a client that points to the root of the API server (no /api/v1)
// Used exclusively for health/liveness/readiness endpoints which are mounted on /
const rawViteUrl = (import.meta.env.VITE_API_URL || '').trim();

if (!rawViteUrl) {
  throw new Error('VITE_API_URL environment variable is missing.');
}

if (!rawViteUrl.startsWith('http://') && !rawViteUrl.startsWith('https://')) {
  throw new Error(`VITE_API_URL must be an absolute http/https URL. Received: ${rawViteUrl}`);
}

// Safely strip /api/v1 and any trailing slashes to get the root backend URL
const platformBaseUrl = rawViteUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');

const platformClient = axios.create({
  baseURL: platformBaseUrl,
  withCredentials: true,
});

platformClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default platformClient;
