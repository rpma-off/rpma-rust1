﻿Role: Senior Full-Stack Architect & QA Engineer (Specializing in Rust/Tauri & React/Next.js)

Objective: Perform a rigorous technical and functional audit of the Task Management CRUD functionality (Create, Read, Update, Delete, List) within the application. 

Audit Instructions:

Analyze the Task CRUD functionality across the following 5 dimensions. For each, identify Compliance (what matches), Discrepancies (mismatches between layers), and Risks (potential bugs or security gaps).

1. Architectural Integrity & Code Structure
Command Pattern: Verify if the API command for tasks correctly handles the Command/Query responsibility. Does it support all required actions (Create, Get, Update, Delete, List, Statistics) via a unified interface or distinct endpoints?

Separation of Concerns: Analyze if the architecture correctly delegates logic from the API layer (Command) to the Business Logic layer (Service) and finally to the Data Access layer (Repository).

Modularity: Confirm if the module organization supports the distinct separation of Task definitions, types, and logic.

2. Database Schema & Data Integrity
Schema Alignment: Compare the Task table definition against the fields required by the "Create Task" user flow. Are all necessary fields (e.g., Vehicle details, Client association, PPF zones) present and correctly typed?

Constraints & Enums: Verify if database constraints (e.g., Check Constraints for Status and Priority) strictly match the Enums defined in the API types. Are invalid states prevented at the database level?

Indexing Strategy: Evaluate if the existing indexes support the filtering and sorting requirements described in the functional specifications (e.g., filtering by Status, Technician, or Date).

3. API & Data Contract
Payload Completeness: Audit the Request and Response structures. Do they include all necessary data for the frontend to render the Task Details and List views without over-fetching or under-fetching?

Error Handling: Evaluate if the API response wrapper is used consistently. Does the system handle specific edge cases (e.g., "Client not found" during task creation) with distinct error codes?

Type Safety: Assess the strategy for synchronizing backend types with frontend interfaces. Is there a mechanism to prevent type drift?

4. Business Logic & Workflow Compliance
Identifier Management: Verify the strategy for generating Task Numbers. Is uniqueness guaranteed and handled server-side?

State Transitions: Does the system enforce valid workflow transitions (e.g., ensuring a task moves from 'Draft' to 'Scheduled' only when specific criteria are met)?

Offline Capability: Analyze how CRUD operations interact with the synchronization or queueing mechanisms to support offline-first requirements.

5. Security & Authorization
Access Control: Check if the Task commands implement session validation. Are permissions checked to ensure only authorized roles (e.g., Admins/Technicians vs. Viewers) can perform destructive actions like Delete or Update?

Input Validation: Does the design rely on validation at both the API boundary (Input Sanitization) and the Service layer (Business Rules)?

Deliverable: Produce a structured Audit Report containing:

Executive Summary: A pass/fail assessment of the module's readiness.

Gap Analysis: A table listing specific discrepancies between the Requirements and the Technical Implementation.

Critical Risks: Any architectural, data integrity, or security blockers.

Optimization Recommendations: Specific suggestions for SQL indexing, code refactoring, or payload optimization.