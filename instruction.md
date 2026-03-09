﻿AUDIT MODE – PATCH OUTPUT REQUIRED

Files:
- `frontend/src/lib/backend/` (generated TS types)
- `src-tauri/src/shared/contracts/` + all `#[derive(ts_rs::TS)]` structs

Checks:
- Rust structs with `#[ts(export)]` whose generated TS file is outdated
- Optional fields in Rust (`Option<T>`) mapped as required in TS
- Enum variants present in Rust missing from TS union
- TS types manually edited after generation (drift from source of truth)
- `types:sync` script output differing from committed files

Output: `npm run types:sync` equivalent patch + list of drifted types.