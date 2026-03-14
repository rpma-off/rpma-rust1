AUDIT MODE — patch only.

Scan src-tauri/src/domains/**/ for error handling violations (ADR-019).

Rules to enforce:
  1. Domain and infrastructure layers must use thiserror error types — never AppError
  2. Only the IPC layer converts to AppError via .map_err()
  3. No panic!(), unwrap(), or expect() calls in non-test production code
  4. No raw anyhow::Error leaking past the IPC boundary
  5. All AppError variants must sanitize internal details
     (e.g. no raw SQL error messages in AppError::Internal)

For each violation:
  - Print file + line + violation
  - Produce a minimal patch (e.g. replace .unwrap() with ?, add .map_err())
  - Do NOT change error type signatures in domain/infrastructure modules
