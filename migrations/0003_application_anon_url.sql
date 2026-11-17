-- 0003_application_anon_url.sql
-- Adds an optional Launchpad link shown to signed-out visitors.
-- NULL means the Launchpad falls back to `main_url`.
--
-- Mirrored in server/models/Application.ts.

ALTER TABLE `applications`
  ADD COLUMN `anon_url` VARCHAR(255) NULL AFTER `main_url`;
