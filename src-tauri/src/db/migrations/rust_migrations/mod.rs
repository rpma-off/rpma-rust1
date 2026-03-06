//! Individual Rust migration implementations.
//!
//! Each function handles a specific migration version that requires Rust logic
//! beyond what a plain SQL file can express (e.g., table recreations, data
//! transformations, conditional column additions).
//!
//! Sub-modules group migrations by version range:
//!
//! - `early`            — migrations 002–012 (core schema restructuring)
//! - `mid`              — migrations 016–018 (indexes, cache, audit log)
//! - `inventory_audit`  — migrations 024–027 (inventory system, audit, perf indexes, constraints)
//! - `user_integrity`   — migrations 028–034 (user columns, sessions, FKs, CHECK constraints)
//! - `late`             — migration 040+ (activity indexes)

mod early;
mod inventory_audit;
mod late;
mod mid;
mod user_integrity;
