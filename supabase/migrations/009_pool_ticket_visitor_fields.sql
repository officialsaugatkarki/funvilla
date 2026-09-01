-- Migration: Add visitor contact fields to pool_tickets
-- These fields are nullable for backward compatibility with existing tickets.

ALTER TABLE pool_tickets
  ADD COLUMN IF NOT EXISTS visitor_phone   TEXT,
  ADD COLUMN IF NOT EXISTS visitor_address TEXT,
  ADD COLUMN IF NOT EXISTS visitor_gender  TEXT CHECK (visitor_gender IN ('male', 'female', 'other'));
