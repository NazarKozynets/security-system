# Migration SQL Review Notes

Use this checklist for each migration folder in `prisma/migrations/*`.

## Required checks
- Confirm every new FK has the intended `ON DELETE` behavior.
- Confirm every unique/primary key supports the data integrity rule.
- Confirm new indexes match actual query/report filters.
- Confirm no destructive change (drop/rename) is applied without backup/mapping.
- Confirm default values and nullability align with runtime behavior.
- Confirm enum changes are backward-compatible with existing rows.

## Per-migration template

### Migration name
`YYYYMMDDHHMMSS_<migration_name>`

### Why this migration exists
- (business/domain reason)

### SQL summary
- Added:
- Altered:
- Removed:

### Risk review
- Data loss risk:
- Locking/performance risk:
- Rollback strategy:

### Verification queries
- Row count checks:
- FK consistency checks:
- Index usage checks:
