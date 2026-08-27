# Database migrations

This project has no migration runner. `connectDatabase()` only calls
`sequelize.sync({ alter: true })` when `NODE_ENV=test`, so the test database is built
from the model decorators while every other environment is changed by hand.

This folder is the ordered record of DDL that must be applied to development, staging,
and production databases.

## Conventions

- Files are named `NNNN_short_description.sql` and applied in ascending order.
- A file is never edited after it merges. Corrections go in a new file.
- Every change here must also be reflected in the Sequelize model, so the test database
  (`sync({ alter: true })`) ends up with the same schema.
- Apply with `mysql -h <host> -u <user> -p <database> < migrations/NNNN_*.sql`.

## Applied

| File | Applied to dev | Applied to staging | Applied to prod |
| --- | --- | --- | --- |
| `0001_users_search_indexes.sql` | | | |
