# ⚠️ DEPRECATED: This Directory is Not Used

**Important**: This directory is **NOT** used by the migration system.

## Current Migration System

All migrations are located in and should be added to:
```
src-tauri/migrations/
```

The migration system uses:
```rust
include_dir!("$CARGO_MANIFEST_DIR/migrations")
```

Which resolves to `src-tauri/migrations/`, not this root `migrations/` directory.

## Files in This Directory

The files in this directory were created by mistake and are not being applied:
- They have conflicting version numbers with actual migrations in `src-tauri/migrations/`
- The migration system does not scan this directory
- These files should not be modified or relied upon

## Adding New Migrations

Always add new migrations to `src-tauri/migrations/` following the naming pattern:
```
NNN_description.sql
```

For example:
```
src-tauri/migrations/038_add_feature.sql
```

See `docs/agent-pack/07_DATABASE_AND_MIGRATIONS.md` for complete migration documentation.
