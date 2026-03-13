---
title: "Type Safety and Generation"
summary: "How RPMA maintains end-to-end type safety between Rust and TypeScript."
read_when:
  - "Creating new domain models"
  - "Updating existing types"
  - "Debugging type mismatches"
---

# Type Safety and Generation

RPMA ensures strict type safety across the entire stack by using Rust as the single source of truth for all shared data structures (ADR-015).

## Shared Types (ADR-015)

All domain models, request payloads, and response DTOs are defined in Rust and exported to TypeScript using `ts-rs`.

### Workflow
1.  **Define in Rust**: Add the `#[derive(TS)]` and `#[ts(export)]` macros to your Rust struct or enum.
2.  **Generate TS**: Run `npm run types:sync` from the project root.
3.  **Use in TS**: Import the generated types from `@/types/`.

### Example Rust Struct:
```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "frontend/src/types/Material.ts")]
pub struct Material {
    pub id: String,
    pub name: String,
    pub stock: f64,
}
```

## Backend Type Guards (Frontend)

To ensure the backend response at runtime matches the compile-time types, we use **Zod** or manual type guards in the frontend IPC layer.

- **Rule**: Every `safeInvoke` result SHOULD be passed through `extractAndValidate`.
- **Location**: `frontend/src/lib/validation/backend-type-guards.ts`

### Example Type Guard Usage:
```typescript
import { validateTask } from '@/lib/validation/backend-type-guards';

const result = await safeInvoke(IPC_COMMANDS.TASK_GET, { id });
const task = extractAndValidate(result, validateTask); // Throws if invalid
```

## TypeScript Constraints

- **Strict Mode**: `tsconfig.json` has `"strict": true` and `"noUncheckedIndexedAccess": true`. **No exceptions.**
- **No Manual Edits**: Files in `frontend/src/types/` are auto-generated. **NEVER** edit them manually as they will be overwritten.
- **Enums**: Rust enums are exported as TypeScript enums or unions, depending on the `ts-rs` configuration.

## Commands for Type Safety

- `npm run types:sync`: Regenerates all TypeScript types from Rust source.
- `npm run types:validate`: Checks for consistency between Rust and TypeScript types.
- `npm run types:drift-check`: Detects if generated types have drifted from the Rust source (used in CI).

## Related Files
- `src-tauri/src/bin/export_types.rs`: Entry point for type generation.
- `frontend/src/types/`: Target directory for generated types.
- `frontend/src/lib/ipc/core.ts`: The `extractAndValidate` utility.
