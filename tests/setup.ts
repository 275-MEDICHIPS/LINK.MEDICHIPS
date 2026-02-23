import "@testing-library/jest-dom";

// Mock environment variables
process.env.JWT_SECRET = "test-jwt-secret-32-chars-minimum!";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-32-chars-min!";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/medichips_link_test";
process.env.REDIS_URL = "redis://localhost:6379";
