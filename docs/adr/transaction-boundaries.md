# ADR: Transaction Boundaries

- Status: Accepted

## Context
Transaction ownership must be explicit to avoid partial writes and cross-domain side effects.

## Decision
Transactions are defined in application use-cases only, never in IPC handlers, and never span multiple domains.

## Consequences
Atomicity is maintained while preserving bounded-context independence.

## Alternatives considered
Allowing transactions in command handlers was rejected as it leaks orchestration concerns.
