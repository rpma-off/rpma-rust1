---
title: "Project Overview"
summary: "High-level introduction to RPMA v2, its mission, tech stack, and core domains."
read_when:
  - "Onboarding to the project"
  - "Understanding the high-level architecture"
  - "Identifying core business domains"
---

# 00. PROJECT OVERVIEW

RPMA v2 (Resource Planning & Management Application) is a high-performance desktop application built with **Tauri**, **Rust**, and **Next.js**. It is specifically designed for managing field service interventions, particularly in the **PPF (Paint Protection Film)** industry.

## Core Mission
To provide a reliable, offline-first (via local SQLite) platform for technicians to manage tasks, track inventory, and document interventions while giving administrators full visibility into operations.

## Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend**: Rust + Tauri.
- **Database**: SQLite with WAL (Write-Ahead Logging) mode and encryption support.
- **Communication**: Tauri IPC (Inter-Process Communication) with typed contracts via `ts-rs`.
- **State Management**: TanStack Query (Server state), Zustand (UI state).

## Top-Level Modules (Domains)
Located in `src-tauri/src/domains/` and mirrored in `frontend/src/domains/`.

- **Tasks**: Lifecycle of jobs from creation to scheduling and completion.
- **Clients**: Management of client profiles and history.
- **Interventions**: Core workflow engine for executing technical work (PPF specific).
- **Inventory**: Material tracking, consumption recording, and stock management.
- **Calendar**: Scheduling and resource allocation visualization.
- **Quotes**: Estimating work and converting successful quotes to tasks.
- **Users & Auth**: RBAC (Role-Based Access Control) and session management.
- **Documents & Photos**: Storage and metadata for job-related evidence and reports.
- **Notifications**: System and user-triggered alerts.

## Golden Paths (Start Here)
1. [Domain Model](./01_DOMAIN_MODEL.md) — Understand the entities and their relationships.
2. [Architecture](./02_ARCHITECTURE_AND_DATAFLOWS.md) — How data moves from React to Rust to SQLite.
3. [IPC API](./05_IPC_API_AND_CONTRACTS.md) — The contract between the two worlds.
4. [Testing Guide](./10_TESTING_GUIDE.md) — Mandatory testing requirements.

## Repository Layout
- `frontend/`: Next.js App Router application.
- `src-tauri/`: Rust backend, migrations, and Tauri configuration.
- `docs/adr/`: Detailed Architectural Decision Records (ADR-001 to ADR-020).
- `scripts/`: Utilities for type sync, migrations, and architecture checks.
- `Makefile`: Centralized command runner for common tasks.
