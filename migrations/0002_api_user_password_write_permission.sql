-- 0002_api_user_password_write_permission.sql
-- Adds the `user_passwords:write` API User permission, which gates
-- POST /api/v1/users/:uuid/password-change-direct (admin-initiated password reset).
--
-- The permission is modeled as its own resource (`user_passwords`) rather than as
-- `users:password_reset`, because APIUserController.parseAPIUserPermissions splits the
-- column name on the LAST underscore. A `users_password_reset` column would parse back
-- to `users_password:reset` and fail the isAPIUserPermission type guard.
--
-- Nullable with no default, matching every other permission column on this table.
-- Existing API Users therefore read as NULL (falsy), so nobody gains the ability
-- to reset passwords without an explicit grant.
--
-- Mirrored in server/models/APIUserPermissionConfig.ts.

ALTER TABLE `api_users_permissions_configs`
  ADD COLUMN `user_passwords_write` TINYINT(1) NULL;
