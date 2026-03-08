-- PostgreSQL initialization script
-- This runs automatically on first container startup

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set search path
SET search_path TO public;
