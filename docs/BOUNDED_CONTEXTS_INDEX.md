# Bounded Contexts Migration - Documentation Index

**Project**: RPMA v2 Frontend Architecture Refactoring  
**Status**: Implementation In Progress (Patch Mode)  
**Created**: 2026-02-17  
**Last Updated**: 2026-02-18  

---

## Document Overview

This directory contains the planning package and execution references for migrating the RPMA v2 frontend to a bounded contexts architecture with internal public APIs.

### Quick Navigation

| Document | Purpose | Audience | Lines |
|----------|---------|----------|-------|
| [Executive Summary](#executive-summary) | Business case and decision | Leadership, PMs | 300+ |
| [Migration Plan](#migration-plan) | Complete technical roadmap | Architects, Tech Leads | 900+ |
| [Implementation Guide](#implementation-guide) | Developer handbook | All Developers | 800+ |
| [Validation Script](#validation-script) | Automated enforcement | DevOps, CI/CD | 500+ |

---

## Executive Summary

**File**: [`BOUNDED_CONTEXTS_EXECUTIVE_SUMMARY.md`](./BOUNDED_CONTEXTS_EXECUTIVE_SUMMARY.md)

### For: Leadership and Decision Makers

**Purpose**: Business case for the migration with ROI analysis and decision criteria.

**Contains**:
- Business value proposition
- Cost-benefit analysis
- Risk assessment
- Resource requirements
- Success metrics
- Approval recommendation

**Key Numbers**:
```
Investment:  $14,000 (140 hours)
Annual ROI:  340% ($48,000 savings)
Breakeven:   3 months
Duration:    14 weeks
Risk:        Low (incremental approach)
```

**Read this if you need to**:
- Understand the business value
- Make a go/no-go decision
- Allocate resources
- Communicate to stakeholders

---

## Migration Plan

**File**: [`BOUNDED_CONTEXTS_MIGRATION_PLAN.md`](./BOUNDED_CONTEXTS_MIGRATION_PLAN.md)

### For: Technical Leads and Architects

**Purpose**: Complete technical specification and roadmap for the migration.

**Contains**:

### Section 1: Current State (Lines 1-400)
- Project overview and goals
- Codebase inventory (260+ components, 67 hooks)
- Architectural pain points analysis
- Dependency mapping
- Technical debt quantification

### Section 2: Target Architecture (Lines 401-700)
- 10 bounded contexts definition
- Internal public API pattern
- TypeScript path aliases
- Dependency rules
- Context boundaries diagram

### Section 3: Guardrails (Lines 701-850)
- ESLint rules configuration
- Architecture validation script
- Pre-commit hooks
- CI/CD integration

### Section 4: Migration Strategy (Lines 851-1000)
- 5-phase migration plan (14 weeks)
- Phase priorities and dependencies
- Risk mitigation strategies
- Success criteria per phase

### Section 5: Implementation Patterns (Lines 1001-1500)
- State management pattern
- IPC client encapsulation
- Type management strategy
- Component decomposition
- Cross-domain communication

### Section 6: Metrics and Criteria (Lines 1501-1600)
- Quantitative metrics
- Qualitative metrics
- Success criteria checklist
- Quality gates

### Section 7: Developer Guide (Lines 1601-1800)
- Quick start for new features
- Creating new contexts
- Common migration patterns
- FAQs

**Read this if you need to**:
- Understand the complete technical approach
- Review architectural decisions
- Plan implementation details
- Identify risks and dependencies

---

## Implementation Guide

**File**: [`BOUNDED_CONTEXTS_IMPLEMENTATION_GUIDE.md`](./BOUNDED_CONTEXTS_IMPLEMENTATION_GUIDE.md)

### For: All Developers

**Purpose**: Practical handbook with templates and patterns for day-to-day development.

**Contains**:

### Quick Reference (Lines 1-100)
- File structure checklist
- Import path checklist
- Common commands

### Domain Templates (Lines 101-900)
- Template 1: Public API (`api/index.ts`)
- Template 2: React Provider Component
- Template 3: Main Hook (`use{Context}`)
- Template 4: Actions Hook (`use{Context}Actions`)
- Template 5: IPC Client Wrapper
- Template 6: Types Definition
- Template 7: Domain README

### Testing Patterns (Lines 901-1100)
- Provider tests
- Action hook tests
- Integration tests
- Component tests

### Common Pitfalls (Lines 1101-1300)
- Importing from internal modules
- Circular dependencies
- Shared state in services
- Exposing too much in public API
- Not using path aliases

### Troubleshooting (Lines 1301-1500)
- Module not found errors
- Provider usage errors
- ESLint violations
- Circular dependency errors
- Type errors

**Read this if you need to**:
- Implement a new bounded context
- Migrate existing code
- Fix validation errors
- Follow best practices
- Copy-paste code templates

---

## Validation Script

**File**: [`../scripts/validate-bounded-contexts.js`](../scripts/validate-bounded-contexts.js)

### For: DevOps and All Developers

**Purpose**: Automated validation of bounded context architecture rules.

**Validates**:

1. **Public API Existence**
   - Each domain has `api/index.ts`
   - API file has exports
   - Required exports present (Provider, hooks, types)

2. **No Internal Imports**
   - No imports from other domains' services/ipc/hooks
   - No deep relative imports
   - App layer only imports from public APIs

3. **Shared Independence**
   - Shared layer doesn't import from domains
   - Prevents coupling to business logic

4. **No Circular Dependencies**
   - Detects circular imports between domains
   - Shows dependency cycle path

5. **TypeScript Aliases**
   - Path aliases configured correctly
   - Aliases point to `/api` directories

6. **Domain Structure**
   - Required directories exist
   - README.md present
   - Tests directory exists

**Usage**:
```bash
# Run validation
npm run validate:bounded-contexts

# Or directly
node scripts/validate-bounded-contexts.js
```

**CI/CD Integration**:
- Runs in pre-commit hook
- Runs in CI pipeline
- Blocks merge on violations

**Output**:
- Green: All rules passed
- Yellow: Warnings (non-blocking)
- Red: Errors (blocking)

---

## Migration Progress Tracking

### Current Status: Implementation In Progress

**Latest Snapshot**:
- Domain scaffolding: expanded to 13 bounded contexts (`admin`, `analytics`, `audit`, `auth`, `clients`, `interventions`, `inventory`, `notifications`, `reports`, `settings`, `tasks`, `users`, `workflow`)
- Server facades: added under `domains/*/server` for route-layer boundaries
- Path aliases: updated for new domain APIs in both `tsconfig.json` and `frontend/tsconfig.json`
- Boundary tooling: added (`boundary:report`, `boundary:enforce`, allowlist file)
- Legacy import migration: completed for all tracked frontend boundary hotspots (57 files baseline -> 0 active violations)
- App UI server-facade imports: removed (`src/app/**` non-API now has 0 imports of `@/domains/*/server`)
- Frontend gates: `frontend:lint`, `frontend:type-check`, `boundary:enforce`, `validate:bounded-contexts`, and `architecture:check` pass
- Full `quality:check`: pass (including `cargo fmt --check`)

| Phase | Status | Duration | Domains |
|-------|--------|----------|---------|
| Phase 1: Foundation | Completed | Week 1-2 | Auth + boundary guardrails |
| Phase 2: Core | Completed | Week 3-6 | Tasks, Workflow, Inventory, Interventions |
| Phase 3: Supporting | Completed | Week 7-10 | Clients, Users, Analytics, Settings, Admin |
| Phase 4: Specialized | Completed | Week 11-12 | Reports, Notifications, Audit |
| Phase 5: Cleanup | In Progress | Week 13-14 | API surface tightening + legacy shim retirement |

---

## 100% Boundary Coverage Program

### Definition of Done

Boundary coverage is considered **100%** when:

1. No imports of `@/lib/services/**` or `@/lib/ipc/domains/**` exist outside sanctioned domain server facades.
2. `src/app/**` UI imports only domain public APIs (`@/domains/<domain>`) and `@/shared/**`.
3. `src/app/api/**` imports domain modules only through `@/domains/<domain>/server`.
4. Non-domain layers avoid deep internal domain imports (`components/hooks/services/ipc`).
5. `boundary:enforce` reports zero unexpected violations.

### Burn-Down Scoreboard

| Metric | Baseline | Current | Target | Status |
|--------|----------|---------|--------|--------|
| Legacy imports in tracked frontend layers | 57 files | 0 files | 0 | Achieved |
| Legacy imports in `src/app/api/**` | 41 files | 0 files | 0 | Achieved |
| Boundary enforcement violations | N/A | 0 | 0 | Achieved |
| Allowlist entries | 0 (new file) | 0 | 0 | Achieved |

### Batch Roadmap Status

| Batch | Scope | Status | Notes |
|-------|-------|--------|-------|
| Batch 0 | Guardrails + docs | Completed | Added boundary scripts and enforcement wiring |
| Batch 1 | Settings + Admin/User routes | Completed | Migrated to `@/domains/*/server` |
| Batch 2 | Analytics + Clients + Notifications | Completed | Migrated and verified via lint/type-check |
| Batch 3 | Workflow/Tasks/Photos + hook hotspots | Completed | Legacy imports removed from targeted hooks/components |
| Batch 4 | Domain internals + shared cleanup | Completed | Shared no longer depends on domains |
| Batch 5 | Strict surface + zero violations | Completed | Removed transitional service/IPC exports from `auth/tasks/interventions` APIs; `boundary:enforce` reports zero violations |

### Completion Checklist

#### Planning Phase
- [x] Analyze current architecture
- [x] Define bounded contexts
- [x] Create migration plan
- [x] Write implementation guide
- [x] Create validation script
- [x] Document business case
- [x] Get stakeholder buy-in

#### Phase 1: Foundation
- [x] Set up domain structure
- [x] Configure TypeScript aliases
- [x] Add ESLint rules
- [x] Integrate validation script
- [x] Migrate Auth domain
- [ ] Train team

#### Phase 2-5: Execution
- [x] Migrate Tasks domain
- [x] Migrate Inventory domain
- [x] Migrate Interventions domain
- [x] Update consumers in `app/**`
- [x] Add domain tests
- [x] Validate architecture (quality gates passing)
- [ ] Remove old code

---

## Success Metrics Dashboard

### Quantitative Metrics

| Metric | Baseline | Current | Target | Status |
|--------|----------|---------|--------|--------|
| Cross-domain internal imports | ~50 | 0 (validated) | 0 | Achieved |
| Circular dependencies | ~8 | 0 (validated) | 0 | Achieved |
| Public API coverage | 0% | 13/13 domains have `api/index.ts` | 100% | In Progress |
| Test coverage | 70% | In Progress | 85% | In Progress |
| Domains migrated | 0/10 (original plan) | 13/13 (current map) | 100% | Achieved |

### Qualitative Metrics

| Metric | Status |
|--------|--------|
| Developer onboarding time | Not measured yet |
| Feature development time | Not measured yet |
| Code review feedback | Not measured yet |
| Team satisfaction | Not measured yet |

---

## Getting Started

### For Team Leads

1. **Review** [Executive Summary](./BOUNDED_CONTEXTS_EXECUTIVE_SUMMARY.md)
2. **Schedule** team kickoff meeting
3. **Assign** migration lead
4. **Approve** resource allocation

### For Architects

1. **Read** [Migration Plan](./BOUNDED_CONTEXTS_MIGRATION_PLAN.md)
2. **Review** target architecture
3. **Validate** bounded context definitions
4. **Plan** Phase 1 implementation

### For Developers

1. **Read** [Implementation Guide](./BOUNDED_CONTEXTS_IMPLEMENTATION_GUIDE.md)
2. **Run** `npm run validate:bounded-contexts`
3. **Review** code templates
4. **Ask** questions in team meeting

### For DevOps

1. **Install** validation script in CI/CD
2. **Configure** pre-commit hooks
3. **Set up** monitoring for violations
4. **Test** script execution

---

## Support and Questions

### Documentation Issues

If you find errors or have suggestions for improving the documentation:
1. Open an issue in the repository
2. Tag with `documentation` label
3. Reference the specific document and section

### Technical Questions

For questions about implementation:
1. Check the [Implementation Guide FAQ](./BOUNDED_CONTEXTS_IMPLEMENTATION_GUIDE.md#troubleshooting)
2. Ask in team chat (#frontend-architecture)
3. Schedule office hours with migration lead

### Process Questions

For questions about the migration process:
1. Check the [Migration Plan FAQ](./BOUNDED_CONTEXTS_MIGRATION_PLAN.md#faq)
2. Attend weekly migration sync meeting
3. Contact project manager

---

## Document Maintenance

### Review Schedule

- Weekly: Update progress metrics
- Bi-weekly: Refine patterns based on learnings
- Monthly: Review and update documents
- Per Phase: Update completion status

### Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.2.1 | 2026-02-18 | Closed quality gate (`npm run quality:check`), removed remaining app UI `/server` imports, and aligned report tests to domain facades. | Codex |
| 1.2.0 | 2026-02-18 | Added 100% boundary coverage program tracking, server facade migration status, boundary tooling (`boundary:report` / `boundary:enforce`), and updated quality-gate status. | Codex |
| 1.1.0 | 2026-02-17 | Implementation progress update (domains migrated, lint rules added, tests added). Quality gates pending. | Codex |
| 1.0.0 | 2026-02-17 | Initial planning package | GitHub Copilot |

### Contributing

To update these documents:
1. Make changes in feature branch
2. Get review from tech lead
3. Update version history
4. Merge to main

---

## Additional Resources

### Related Documentation

- [ADR-001: Module Boundaries](./adr/001-module-boundaries.md)
- [ADR-005: IPC Mapping](./adr/005-ipc-mapping.md)
- [Architecture Overview](./agent-pack/02_ARCHITECTURE_AND_DATAFLOWS.md)
- [Frontend Guide](./agent-pack/03_FRONTEND_GUIDE.md)

### External References

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Bounded Context Pattern](https://martinfowler.com/bliki/BoundedContext.html)
- [React Query Best Practices](https://tkdodo.eu/blog/react-query-best-practices)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)

---

## Approval and Sign-off

### Required Approvals

- [ ] **Technical Lead**: Architecture and approach
- [ ] **Engineering Manager**: Resource allocation
- [ ] **Product Owner**: Timeline and priorities

### Approval Criteria

- Documentation reviewed and complete
- Business case validated
- Technical approach sound
- Team capacity confirmed
- Risk mitigation acceptable

---

**Status**: **IMPLEMENTATION IN PROGRESS**  
**Next Action**: Continue retiring transitional server-facade broad re-exports domain by domain.  

**Prepared by**: Codex  
**Date**: 2026-02-18  
**Document Version**: 1.2.1
