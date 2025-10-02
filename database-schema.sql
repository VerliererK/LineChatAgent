-- Create users table for Neon database
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  messages JSONB DEFAULT '[]'::jsonb
);

-- Create settings table for global settings
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
