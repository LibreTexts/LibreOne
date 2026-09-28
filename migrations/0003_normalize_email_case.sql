-- 0003_normalize_email_case.sql
-- Canonicalizes stored email addresses and pins the collation of every email column.
--
-- The application now writes addresses in one canonical form (trim, Unicode NFC,
-- lowercase) via normalizeEmail() in email.ts, enforced at the boundary by
-- emailValidator in server/validators/shared.ts and again by the @BeforeValidate hooks
-- on User, EmailVerification, and EmailEvent. This file brings existing rows in line
-- and makes the database enforce the same policy.
--
-- Diacritics are preserved on purpose: jose@x.com and jose@x.com (with an accent) are
-- distinct addresses, so the target collation is case-insensitive but ACCENT-SENSITIVE.
--
-- RUN THIS FILE IN THREE PASSES, WITH A HUMAN BETWEEN THEM. Do not pipe it in whole.

-- ---------------------------------------------------------------------------
-- PASS 0 - survey. Record the answers before changing anything.
-- ---------------------------------------------------------------------------

-- utf8mb4_0900_as_ci in PASS 3 requires MySQL 8.0 or newer.
SELECT VERSION();

-- What the columns are today. A *_ci collation here means no case-variant duplicates
-- can already exist, so PASS 1 returning zero rows is confirmation rather than luck.
SHOW FULL COLUMNS FROM `users` LIKE 'email';
SHOW FULL COLUMNS FROM `email_verifications` LIKE 'email';
SHOW FULL COLUMNS FROM `email_events` LIKE 'email';

-- Addresses holding characters outside ASCII. Expected to be zero or near it. MySQL
-- cannot apply Unicode NFC, so any rows listed here are normalized by the model hook
-- the next time the record is written; note the count and move on.
SELECT `uuid`, `email` FROM `users` WHERE `email` <> CONVERT(`email` USING ASCII);

-- ---------------------------------------------------------------------------
-- PASS 1 - collision detection. If this returns ANY rows, STOP.
-- ---------------------------------------------------------------------------
-- Two accounts differing only by case cannot both survive the lowercase backfill, and
-- the unique index on users.email will reject the UPDATE. Resolve each pair by hand:
-- decide which account is real, then migrate or disable the other. Do not automate it,
-- because the wrong choice locks a real person out of their account.

SELECT LOWER(`email`) AS normalized, COUNT(*) AS n, GROUP_CONCAT(`uuid`) AS uuids
FROM `users`
GROUP BY normalized
HAVING n > 1;

-- Useful when triaging a collision: which of the pair has been used most recently.
-- SELECT uuid, email, last_access, created_at, disabled
-- FROM users WHERE LOWER(email) = '<normalized address from above>';

-- ---------------------------------------------------------------------------
-- PASS 2 - backfill. Only once PASS 1 returns zero rows.
-- ---------------------------------------------------------------------------
-- email_verifications rows expire after 24 hours and email_events has no unique
-- constraint on email alone, so neither needs a collision pre-check.

UPDATE `users`               SET `email` = LOWER(`email`) WHERE `email` <> BINARY LOWER(`email`);
UPDATE `email_verifications` SET `email` = LOWER(`email`) WHERE `email` <> BINARY LOWER(`email`);
UPDATE `email_events`        SET `email` = LOWER(`email`) WHERE `email` <> BINARY LOWER(`email`);

-- Confirm. All three must return 0.
SELECT COUNT(*) FROM `users`               WHERE `email` <> BINARY LOWER(`email`);
SELECT COUNT(*) FROM `email_verifications` WHERE `email` <> BINARY LOWER(`email`);
SELECT COUNT(*) FROM `email_events`        WHERE `email` <> BINARY LOWER(`email`);

-- ---------------------------------------------------------------------------
-- PASS 3 - collation. Only once PASS 2 reports zero on all three counts.
-- ---------------------------------------------------------------------------
-- utf8mb4_0900_as_ci is accent-sensitive and case-insensitive, which is exactly the
-- application policy. On MySQL 5.7, use utf8mb4_bin instead (exact match, correct
-- because the application always writes lowercase). Do NOT substitute
-- utf8mb4_unicode_ci or utf8mb4_general_ci: both are accent-INSENSITIVE and would
-- collapse jose@x.com and jose@x.com-with-an-accent into one address.

ALTER TABLE `users`
  MODIFY `email` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL;

ALTER TABLE `email_verifications`
  MODIFY `email` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL;

ALTER TABLE `email_events`
  MODIFY `email` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL;

-- Note on the test database: connectDatabase() builds it with sync({ alter: true })
-- from the model decorators, which does not reproduce these collations. Tests must
-- therefore assert application-level normalization rather than lean on the database
-- folding case for them.
