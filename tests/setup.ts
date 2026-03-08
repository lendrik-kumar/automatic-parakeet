import { jest } from "@jest/globals";

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";
process.env.REDIS_HOST = "localhost";
process.env.REDIS_PORT = "6379";
process.env.EMAIL_HOST = "smtp.test.com";
process.env.EMAIL_PORT = "587";
process.env.EMAIL_USER = "test@test.com";
process.env.EMAIL_PASSWORD = "test-password";
process.env.SMS_PROVIDER = "dummy";

// Increase timeout for all tests
jest.setTimeout(10000);
