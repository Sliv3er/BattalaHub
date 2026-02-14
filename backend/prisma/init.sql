-- Battala Hub Database Initialization
-- This script sets up the PostgreSQL database with required extensions

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for full-text search capabilities
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes for better performance (will be created by Prisma migrations)
-- But we can set up some database-level configurations here

-- Set timezone to UTC for consistency
SET timezone = 'UTC';