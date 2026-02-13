﻿warning: `rpma-ppf-intervention` (bin "main") generated 484 warnings (30 duplicates) (run `cargo fix --bin "main"` to apply 11 suggestions)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.93s
     Running `target\debug\main.exe`
2026-02-12T22:10:10.696819Z  INFO ThreadId(01) main: src-tauri\src\main.rs:281: Initializing application setup
2026-02-12T22:10:10.698090Z DEBUG ThreadId(01) main: src-tauri\src\main.rs:288: App data directory: "C:\\Users\\emaMA\\AppData\\Roaming\\com.rpma.ppf-intervention"
2026-02-12T22:10:10.698890Z DEBUG ThreadId(01) main: src-tauri\src\main.rs:292: Created app data directory
2026-02-12T22:10:10.699231Z  INFO ThreadId(01) main: src-tauri\src\main.rs:296: Database path: "C:\\Users\\emaMA\\AppData\\Roaming\\com.rpma.ppf-intervention\\rpma.db"
2026-02-12T22:10:10.699684Z  INFO ThreadId(01) main: src-tauri\src\main.rs:311: Database file exists: true, size: 901120 bytes
2026-02-12T22:10:10.728677Z  INFO ThreadId(01) main: src-tauri\src\main.rs:321: Database connection established
2026-02-12T22:10:10.730831Z  INFO ThreadId(01) main: src-tauri\src\main.rs:331: Database health check passed
2026-02-12T22:10:10.732586Z DEBUG ThreadId(01) main::db::migrations: src-tauri\src\db\migrations.rs:115: All critical tables found, database appears initialized
2026-02-12T22:10:10.733110Z  INFO ThreadId(01) main: src-tauri\src\main.rs:340: Database already initialized, checking for migrations
2026-02-12T22:10:10.733744Z  INFO ThreadId(01) main: src-tauri\src\main.rs:344: Current version: 32, Target version: 35
2026-02-12T22:10:10.734202Z  INFO ThreadId(01) main::db::migrations: src-tauri\src\db\migrations.rs:2391: Applying migration 33: Add FKs for tasks.workflow_id and tasks.current_workflow_step_id
2026-02-12T22:10:10.755842Z ERROR ThreadId(01) main: src-tauri\src\main.rs:350: Failed to apply migrations: Failed to rebuild tasks table: error in view client_statistics: no such table: main.tasks

thread 'main' panicked at C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\tauri-2.10.2\src\app.rs:1299:11:
Failed to setup app: error encountered during setup hook: Failed to rebuild tasks table: error in view client_statistics: no such table: main.tasks
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
[0212/231010.759:ERROR:ui\gfx\win\window_impl.cc:124] Failed to unregister class Chrome_WidgetWin_0. Error = 1412
error: process didn't exit successfully: `target\debug\main.exe` (exit code: 101)
 ✓ Ready in 3.5s

emaMA@LAPTOP-76DN517M MINGW64 /d/rpma-rust (v2-UX)
$
