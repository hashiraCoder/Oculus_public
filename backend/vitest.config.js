import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 15000,
    env: {
      NODE_ENV: 'test',
      DB_USER: 'test_user',
      DB_PASSWORD: 'test_password',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'oculus_test',
      JWT_SECRET: 'super-secret-test-jwt-key-minimum-32-chars-long',
      REDIS_URL: 'redis://127.0.0.1:6379'
    }
  }
});
