# User Flows & Workflows

This document describes the primary user journeys and business workflows implemented in the RPMA-Rust application.

## Core Workflows

### 1. New Organization Onboarding
**User Journey**: First-time administrator setting up the business.
1.  **Welcome**: The user is greeted by the onboarding wizard (`/onboarding`).
2.  **Bootstrap Admin**: The user creates the primary administrator account (`/bootstrap-admin`).
3.  **Company Profile**: Inputting organization name, address, and uploading a logo (`/settings/organization`).
4.  **Initial Setup**: Configuring basic business hours and default task settings.
5.  **Finish**: Redirect to the main dashboard (`/dashboard`).

### 2. Task-to-Intervention Lifecycle
**User Journey**: Technician performing a Paint Protection Film (PPF) application.
1.  **Dashboard**: Technician views assigned tasks for the day (`/dashboard`).
2.  **Task Details**: Opens a specific task to review requirements and client info (`/tasks/[id]`).
3.  **Start Intervention**: Clicks "Start Intervention" to initiate the workflow.
4.  **Guided Steps**: Follows the sequential workflow steps (e.g., *Preparation*, *Application*, *Quality Control*).
5.  **Documentation**: Takes photos at key steps to document work quality (`/interventions/[id]/photos`).
6.  **Material Consumption**: Records materials used (e.g., PPF roll length) from stock.
7.  **Finalize**: Completes the intervention, locking the data and triggering a summary.
8.  **Report**: Generates the final intervention report PDF for the customer (`/reports/[id]`).

### 3. Inventory Management
**User Journey**: Inventory manager tracking and ordering stock.
1.  **Inventory Overview**: Checking current stock levels and alerts for low stock (`/inventory`).
2.  **Incoming Stock**: Recording a new shipment of materials from a supplier.
3.  **Manual Adjustment**: Correcting stock counts after a manual audit.
4.  **Transaction History**: Reviewing who used which materials and when.

### 4. Quotes & Conversion
**User Journey**: Salesperson/Admin providing a price estimate to a client.
1.  **Quote Creation**: Building an itemized quote for a client (`/quotes/new`).
2.  **Review & Export**: Previewing the quote and exporting it to PDF for the client.
3.  **Client Approval**: Marking the quote as "Accepted" when the client confirms.
4.  **Convert**: Clicking "Convert to Task" to automatically create a scheduled task from the quote data.

## Interface States & Logic

### Authentication Guarding
- **Unauthenticated**: Users are redirected to `/login`.
- **Authenticated (No Admin)**: If the system detects no administrators, it redirects to `/bootstrap-admin`.
- **Unauthorized**: If a user attempts to access a page (e.g., `/admin`) without the proper role, they are shown the `/unauthorized` page.

### Loading & Error Handling
- **Data Loading**: Skeletons are shown while IPC commands are in flight.
- **IPC Failure**: Toasts notify the user of validation errors or network failures.
- **Offline Sync**: (If implemented) Indicators for pending syncs with a remote server.

## Business Workflows

### Task Assignment
- Tasks can be assigned to multiple technicians.
- The system checks for availability conflicts in the calendar when a task is scheduled.

### Intervention Report Generation
- Reports are only generated after an intervention is "Finalized."
- The backend compiles the intervention data, metadata, and photos into a structured PDF document stored on disk.
