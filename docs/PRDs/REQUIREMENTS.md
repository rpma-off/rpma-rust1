# Requirements & Features

This document details the features, user stories, and technical requirements identified in the RPMA-Rust application.

## Core Features

### 1. Authentication & Security
*   **Login & Register**: Standard email/password authentication using Argon2.
*   **Two-Factor Authentication (2FA)**: Support for enhanced security via TOTP or similar.
*   **Role-Based Access Control (RBAC)**: Defined roles (Admin, Technician, Supervisor, Viewer) with distinct permissions.
*   **Session Management**: Tracking active sessions, revoking sessions, and configurable timeouts.
*   **Organization-level Onboarding**: Setup flow for new businesses, including logo and basic settings.

### 2. User Management
*   **Admin Bootstrap**: Specialized flow for creating the first administrator.
*   **User CRUD**: Creating, reading, updating, and (soft) deleting users.
*   **Status Management**: Activating or deactivating user accounts.
*   **Profile Settings**: Managing personal profile, avatar, and preferences.

### 3. Client & Task Management
*   **Client Database**: Full CRUD for managing client contact information and history.
*   **Task Lifecycle**: Scheduling, assigning, and tracking the status of tasks (Pending, In Progress, Completed, Delayed).
*   **Task Communication**: Adding internal notes and sending messages to clients regarding task status.
*   **Import/Export**: Bulk import of tasks via CSV and exporting task lists.

### 4. PPF Intervention Workflow
*   **Step-by-Step Guidance**: Guided workflow for Paint Protection Film (PPF) application.
*   **Progress Tracking**: Real-time tracking of intervention status and completion percentage.
*   **Report Generation**: Generating detailed PDF reports with photos for completed interventions.
*   **Workflow Constraints**: Enforced business rules to ensure steps are followed in order and required data is captured.

### 5. Inventory Management
*   **Material Tracking**: Managing PPF rolls, ceramic coatings, and other consumables.
*   **Stock Adjustment**: Recording stock arrival, consumption, and manual adjustments.
*   **Low Stock Alerts**: Automatic detection of materials below threshold levels.
*   **Consumption History**: Detailed tracking of materials used per intervention.
*   **Suppliers & Categories**: Organizing materials by type and source.

### 6. Quotes & Financials
*   **Quote Creation**: Building detailed quotes with itemized services and products.
*   **Status Management**: Tracking quotes from Draft to Accepted, Rejected, or Expired.
*   **PDF Export**: Professional PDF generation for quotes.
*   **Conversion**: Streamlined workflow to convert an accepted quote directly into a task.

### 7. Scheduling & Calendar
*   **Unified Calendar**: Visual view of scheduled tasks and technician availability.
*   **Conflict Detection**: Preventing overbooking of technicians or equipment.
*   **Technician-specific views**: Personalized schedules for detailing staff.

### 8. Documents & Photos
*   **Visual Documentation**: Storing and retrieving photos taken before, during, and after interventions.
*   **Metadata Management**: Tagging photos with relevant information (e.g., zone, condition).

## Identified Data Models

*   **User**: `id`, `email`, `password_hash`, `role`, `status`, `organization_id`.
*   **Client**: `id`, `name`, `email`, `phone`, `address`, `deleted_at`.
*   **Task**: `id`, `client_id`, `title`, `description`, `status`, `priority`, `scheduled_at`.
*   **Intervention**: `id`, `task_id`, `current_step`, `progress`, `started_at`, `finalized_at`.
*   **Material**: `id`, `name`, `sku`, `stock_quantity`, `min_threshold`, `category_id`, `supplier_id`.
*   **Quote**: `id`, `client_id`, `status`, `total_amount`, `valid_until`.

## Technical Constraints

*   **Offline First**: Designed to run as a desktop app with a local database.
*   **Data Integrity**: Enforced via SQLite foreign keys and application-level validation.
*   **Performance**: WAL mode for SQLite and optimized indexes for high-volume data (interventions/photos).
*   **Security**: All database content is encrypted at rest using an application-provided key.
