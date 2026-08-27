-- 0001_users_search_indexes.sql
-- Supports the user list in GET /api/v1/users.
--
-- users_last_name_first_name backs the default sort of the user list.
--
-- An earlier draft of this file also added a FULLTEXT index named `users_search_ft`.
-- Search now matches substrings, which FULLTEXT cannot serve, so the index was dropped
-- from the change. If you already applied that draft, run:
--   ALTER TABLE `users` DROP INDEX `users_search_ft`;
--
-- Mirrored in server/models/User.ts (@Table indexes).

ALTER TABLE `users`
  ADD INDEX `users_last_name_first_name` (`last_name`, `first_name`);
