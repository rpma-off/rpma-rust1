# ADR-006: RBAC Policy

## Status
Accepted

## Context
The application supports multiple user roles (Admin, Manager, Technician, Viewer) with different access levels.

## Decision
- All protected IPC commands require a `session_token` parameter.
- The `authenticate!` macro validates the session token and returns the current user.
- Role-based checks are performed at the command handler level using validators in `commands/validators.rs`.
- Session tokens are validated on every protected endpoint.

## Consequences
- Unauthorized access is blocked at the IPC boundary.
- Role definitions can evolve without changing the authentication mechanism.
- Every command handler follows a consistent authentication pattern.
