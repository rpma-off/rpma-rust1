# ADR: Error Contract

- Status: Accepted

## Context
IPC consumers need stable and safe error payloads without leaking storage internals.

## Decision
Domain/application errors are mapped into a shared response contract at IPC boundaries.

## Consequences
Frontend behavior stays predictable and backend internals remain encapsulated.

## Alternatives considered
Returning raw SQL or repository errors was rejected for security and compatibility reasons.
