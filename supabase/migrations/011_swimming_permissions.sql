-- Migration: Insert swimming permissions into DB and assign to roles
-- These permissions were defined in code but never inserted into the live database,
-- which caused "Access Denied" for all users including owner.

-- 1. Insert the new permissions (skip if already exist)
INSERT INTO permissions (name, description, resource, action)
VALUES
  ('swimming:access',  'Access swimming ticket management', 'swimming', 'access'),
  ('swimming:tickets', 'Issue swimming tickets',            'swimming', 'tickets')
ON CONFLICT (name) DO NOTHING;

-- 2. Owner: give all permissions (catches any new ones)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner'
  AND p.name IN ('swimming:access', 'swimming:tickets')
ON CONFLICT DO NOTHING;

-- 3. Admin: all except settings:manage
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.name IN ('swimming:access', 'swimming:tickets')
ON CONFLICT DO NOTHING;

-- 4. Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
  AND p.name IN ('swimming:access', 'swimming:tickets')
ON CONFLICT DO NOTHING;

-- 5. Reception
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'reception'
  AND p.name IN ('swimming:access', 'swimming:tickets')
ON CONFLICT DO NOTHING;
