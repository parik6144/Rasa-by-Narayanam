-- RBAC notes (no required ALTER beyond isActive — see add-user-isactive.sql)
-- User.role string values: customer | admin | manager | sales
-- Staff console (/admin): admin, manager, sales only
-- Permissions are enforced in application code (src/lib/permissions.ts)

-- Optional: ensure seeded staff roles if rows already exist
-- UPDATE user SET role = 'admin', isActive = 1 WHERE email = 'admin@rasakitchen.co';
-- UPDATE user SET role = 'manager', isActive = 1 WHERE email = 'manager@rasakitchen.co';
-- UPDATE user SET role = 'sales', isActive = 1 WHERE email = 'sales@rasakitchen.co';
