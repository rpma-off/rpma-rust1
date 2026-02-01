# Requirements Specification

## Executive Summary

RPMA PPF Intervention is an offline-first desktop application designed for automotive Paint Protection Film (PPF) installation businesses. The system manages the complete lifecycle of PPF interventions, from client intake to final quality assurance, with comprehensive offline capabilities and real-time synchronization.

## Functional Requirements

### 1. User Management & Authentication

#### FR-1.1: User Roles
**Identified in**: `src-tauri/src/db/schema.sql` (users table), `src-tauri/src/models/user.rs`

The system supports four distinct user roles:
- **Admin**: Full system access, user management, system configuration
- **Technician**: Perform interventions, manage assigned tasks, update client information
- **Supervisor**: Monitor team performance, approve interventions, generate reports
- **Viewer**: Read-only access to reports and dashboards

**Implementation**: Role-based access control enforced at the command layer (`src-tauri/src/commands/auth_middleware.rs`)

#### FR-1.2: Authentication & Security
**Identified in**: `src-tauri/src/services/auth.rs`, `src-tauri/src/commands/auth.rs`

- **Password Authentication**: Argon2 hashing with salt
- **JWT Token System**: Access tokens (short-lived) + Refresh tokens
- **Two-Factor Authentication (2FA)**: TOTP-based (RFC 6238)
- **Session Management**: Configurable timeout (default: 8 hours)
- **Multi-session Support**: Track and revoke individual sessions

**Commands**:
- `auth_login`: Email/password authentication
- `auth_create_account`: New user registration
- `auth_logout`: Session termination
- `auth_validate_session`: Token validation
- `enable_2fa`, `verify_2fa_setup`, `disable_2fa`: 2FA management

#### FR-1.3: User Profile Management
**Identified in**: `src-tauri/src/services/user.rs`, `frontend/src/app/settings/`

- Profile information (name, email, phone, avatar)
- Preferences (theme, language, notifications)
- Security settings (password change, 2FA)
- Accessibility options (high contrast, large text, screen reader)
- Performance settings (cache, offline mode, sync preferences)

### 2. Client Management (CRM)

#### FR-2.1: Client CRUD Operations
**Identified in**: `src-tauri/src/models/client.rs`, `src-tauri/src/repositories/client_repository.rs`

**Client Types**:
- Individual customers
- Business clients (with company name, tax ID, contact person)

**Client Data Model**:
```
- Basic Info: name, email, phone
- Address: street, city, state, zip, country
- Business Info: company_name, tax_id, contact_person
- Statistics: total_tasks, active_tasks, completed_tasks, last_task_date
- Metadata: notes, tags (JSON array)
- Audit: created_at, updated_at, created_by
- Soft delete support
```

**Commands**: `client_crud` (unified CRUD interface)

#### FR-2.2: Client Search & Filtering
**Identified in**: Full-text search implementation in schema

- Full-text search across name, email, phone, company name, notes
- Filter by customer type (individual/business)
- Sort by creation date, last task date
- Search with autocomplete

**Implementation**: SQLite FTS5 virtual table (`clients_fts`)

#### FR-2.3: Client Statistics
**Identified in**: Database triggers in `schema.sql`

Automatically maintained statistics:
- Total tasks count
- Active tasks count
- Completed tasks count
- Last task date

**Implementation**: Database triggers on task insert/update/delete

### 3. Task Management

#### FR-3.1: Task Lifecycle
**Identified in**: `src-tauri/src/models/task.rs`, `src-tauri/src/services/task_crud.rs`

**Task Statuses**:
- `draft`: Initial creation
- `scheduled`: Assigned with date/time
- `assigned`: Assigned to technician
- `in_progress`: Work started
- `paused`: Temporarily stopped
- `completed`: Finished successfully
- `cancelled`: Cancelled by user
- `on_hold`: Waiting for external dependency
- `pending`: Awaiting approval
- `failed`: Failed execution
- `overdue`: Past due date
- `archived`: Historical record

**Priority Levels**: low, medium, high, urgent

#### FR-3.2: Task Assignment
**Identified in**: `src-tauri/src/commands/task.rs`

- Assign tasks to technicians
- Check technician availability
- Validate assignment conflicts
- Track assignment history

**Commands**:
- `check_task_assignment`: Validate assignment
- `check_task_availability`: Check technician schedule
- `task_crud`: Update task assignment

#### FR-3.3: Task Scheduling
**Identified in**: Calendar integration in `src-tauri/src/services/calendar.rs`

- Schedule tasks with date and time
- Check scheduling conflicts
- Calendar view integration
- Recurring tasks (planned)

**Commands**:
- `calendar_get_tasks`: Get tasks for date range
- `calendar_check_conflicts`: Validate scheduling

#### FR-3.4: Bulk Operations
**Identified in**: `src-tauri/src/commands/task.rs`

- Bulk import from CSV
- Bulk export to CSV
- Batch status updates

**Commands**:
- `import_tasks_bulk`: CSV import
- `export_tasks_csv`: CSV export

### 4. PPF Intervention Workflow

#### FR-4.1: Intervention Creation
**Identified in**: `src-tauri/src/services/intervention_workflow.rs`

**Start Intervention Process**:
1. Validate task exists and is eligible
2. Check for existing active interventions
3. Create intervention record with vehicle details
4. Initialize workflow steps based on strategy
5. Set initial status to 'pending'

**Vehicle Information**:
- License plate (required)
- Make, model, year, color
- VIN (Vehicle Identification Number)

**PPF Configuration**:
- PPF zones (predefined or custom)
- Film type: standard, premium, matte, colored
- Film brand and model

**Command**: `intervention_start`

#### FR-4.2: Workflow Steps
**Identified in**: `src-tauri/src/models/step.rs`, workflow strategy pattern

**Step Types**:
1. **Inspection**: Initial vehicle assessment
2. **Preparation**: Surface preparation and cleaning
3. **Installation**: PPF application
4. **Finalization**: Quality check and customer handoff

**Step Properties**:
- Step number (sequential)
- Step name and description
- Status: pending, in_progress, paused, completed, failed, skipped, rework
- Photo requirements (min/max photos)
- Quality checkpoints
- GPS location capture
- Time tracking (started_at, completed_at, duration)

**Step Data Collection**:
- Measurements
- Observations
- Collected data (JSON)
- Validation data

#### FR-4.3: Step Advancement
**Identified in**: `intervention_workflow.rs::advance_step`

**Validation Rules**:
- Current step must be completed
- Required photos must be captured
- Quality checkpoints must pass
- Mandatory fields must be filled
- Steps must be completed in order (no skipping)

**Command**: `intervention_advance_step`

#### FR-4.4: Progress Tracking
**Identified in**: `src-tauri/src/models/intervention.rs`

- Current step number
- Completion percentage (0-100)
- Time tracking per step
- Overall intervention duration
- Estimated vs actual duration

**Commands**:
- `intervention_get_progress`: Get current progress
- `intervention_get_step`: Get specific step details

#### FR-4.5: Intervention Finalization
**Identified in**: `intervention_workflow.rs::finalize_intervention`

**Finalization Requirements**:
- All mandatory steps completed
- Customer satisfaction rating (1-10)
- Quality score (0-100)
- Customer signature capture
- Final observations
- Customer comments

**Post-Finalization**:
- Update task status to 'completed'
- Generate intervention report (PDF)
- Trigger sync queue for offline data
- Send notifications

**Command**: `intervention_finalize`

### 5. Photo Management

#### FR-5.1: Photo Capture & Storage
**Identified in**: `src-tauri/src/models/photo.rs`, photo repository

**Photo Types**:
- Before: Pre-intervention state
- During: Work in progress
- After: Completed work

**Photo Metadata**:
- File information (path, size, mime type, dimensions)
- Classification (type, category, angle, zone)
- EXIF data (camera, capture datetime)
- GPS coordinates (lat, lon, accuracy, altitude)
- Quality metrics (quality_score, blur_score, exposure_score, composition_score)

**Photo Requirements**:
- Configurable per step (min/max photos)
- Required photo validation
- Approval workflow

#### FR-5.2: Photo Quality Assessment
**Identified in**: Quality scoring fields in photo model

Automatic quality assessment:
- Overall quality score (0-100)
- Blur detection
- Exposure analysis
- Composition scoring

**Implementation**: Image processing service (planned)

### 6. Material & Inventory Management

#### FR-6.1: Material Catalog
**Identified in**: `src-tauri/src/models/material.rs`, `src-tauri/src/services/material.rs`

**Material Properties**:
- SKU (Stock Keeping Unit)
- Name and description
- Category and type
- Unit of measure
- Unit cost
- Stock levels (current, minimum, maximum)
- Supplier information
- Expiration tracking

**Commands**:
- `material_create`: Add new material
- `material_get`: Get by ID
- `material_get_by_sku`: Get by SKU
- `material_list`: List all materials
- `material_update`: Update material

#### FR-6.2: Stock Management
**Identified in**: Material service methods

- Track current stock levels
- Low stock alerts
- Expiration date tracking
- Stock adjustments

**Commands**:
- `material_update_stock`: Adjust stock levels
- `material_get_low_stock`: Get low stock items
- `material_get_expired`: Get expired materials

#### FR-6.3: Consumption Tracking
**Identified in**: Material consumption tables and services

- Record material usage per intervention
- Track consumption by technician
- Generate usage reports
- Calculate costs

**Commands**:
- `material_record_consumption`: Record usage
- `material_get_intervention_consumption`: Get intervention usage
- `material_get_intervention_summary`: Usage summary
- `material_get_stats`: Material statistics

### 7. Reporting & Analytics

#### FR-7.1: Dashboard
**Identified in**: `frontend/src/app/dashboard/`, `src-tauri/src/services/dashboard.rs`

**Dashboard Widgets**:
- Task completion rate
- Active interventions count
- Technician performance
- Material usage trends
- Revenue metrics
- Quality scores
- Client statistics

**Command**: `dashboard_get_stats`

#### FR-7.2: Report Types
**Identified in**: `src-tauri/src/commands/reports.rs`, `src-tauri/src/services/reports/`

1. **Task Completion Report**
   - Completion rates by period
   - Status distribution
   - Overdue tasks
   - Command: `get_task_completion_report`

2. **Technician Performance Report**
   - Tasks completed per technician
   - Average completion time
   - Quality scores
   - Customer satisfaction
   - Command: `get_technician_performance_report`

3. **Client Analytics Report**
   - Client activity
   - Revenue per client
   - Task frequency
   - Command: `get_client_analytics_report`

4. **Quality Compliance Report**
   - Quality score trends
   - Failed quality checks
   - Rework rates
   - Command: `get_quality_compliance_report`

5. **Material Usage Report**
   - Consumption by material
   - Cost analysis
   - Waste tracking
   - Command: `get_material_usage_report`

6. **Geographic Report**
   - Tasks by location
   - Service area coverage
   - Travel distance analysis
   - Command: `get_geographic_report`

7. **Seasonal Report**
   - Seasonal trends
   - Peak periods
   - Command: `get_seasonal_report`

8. **Operational Intelligence Report**
   - Predictive analytics
   - Resource optimization
   - Command: `get_operational_intelligence_report`

#### FR-7.3: Report Export
**Identified in**: Report generation services

- PDF export
- CSV export
- Excel export (planned)
- Email delivery (planned)

### 8. Messaging & Notifications

#### FR-8.1: Internal Messaging
**Identified in**: `src-tauri/src/models/message.rs`, messaging tables in schema

**Message Types**:
- Task-related messages
- System notifications
- User-to-user messages

**Message Features**:
- Read/unread status
- Message templates
- Priority levels
- Attachments (planned)

**Commands**:
- `message_send`: Send message
- `message_get_list`: Get messages
- `message_mark_read`: Mark as read
- `message_get_templates`: Get templates
- `message_get_preferences`: Get notification preferences
- `message_update_preferences`: Update preferences

#### FR-8.2: Notification System
**Identified in**: `src-tauri/src/services/notification.rs`, notification settings

**Notification Channels**:
- In-app notifications
- Email notifications
- Push notifications

**Notification Types**:
- Task assigned
- Task updated
- Task completed
- Task overdue
- System alerts
- Security alerts
- Maintenance notifications

**Notification Settings**:
- Enable/disable per channel
- Quiet hours configuration
- Digest frequency (never, daily, weekly)
- Sound settings

**Commands**:
- `initialize_notification_service`: Initialize
- `send_notification`: Send notification
- `test_notification_config`: Test configuration
- `get_notification_status`: Get status

### 9. Calendar & Scheduling

#### FR-9.1: Calendar Events
**Identified in**: `src-tauri/src/models/calendar_event.rs`, calendar service

**Event Types**:
- Task appointments
- Technician availability
- Company holidays
- Maintenance windows

**Event Properties**:
- Title, description
- Start/end time
- All-day events
- Recurrence (planned)
- Attendees
- Location

**Commands**:
- `get_events`: Get events for date range
- `get_event_by_id`: Get specific event
- `create_event`: Create new event
- `update_event`: Update event
- `delete_event`: Delete event
- `get_events_for_technician`: Technician schedule
- `get_events_for_task`: Task-related events

#### FR-9.2: Conflict Detection
**Identified in**: Calendar service

- Detect scheduling conflicts
- Validate technician availability
- Prevent double-booking

**Command**: `calendar_check_conflicts`

### 10. Settings & Configuration

#### FR-10.1: Application Settings
**Identified in**: `src-tauri/src/models/settings.rs`, settings service

**General Settings**:
- Company information
- Business hours
- Default values

**Security Settings**:
- Session timeout
- Password policy
- 2FA enforcement
- IP whitelisting (planned)

**Notification Settings**:
- Email configuration
- SMS configuration (planned)
- Push notification settings

**Performance Settings**:
- Cache size
- Sync interval
- Background sync
- Image compression

**Commands**:
- `update_general_settings`
- `update_security_settings`
- `update_notification_settings`

#### FR-10.2: User Settings
**Identified in**: User settings table in schema

**Profile Settings**:
- Personal information
- Avatar upload

**Preferences**:
- Theme (light, dark, system)
- Language
- Date/time format
- Auto-refresh settings

**Accessibility**:
- High contrast mode
- Large text
- Reduced motion
- Screen reader support
- Keyboard navigation
- Text-to-speech

**Commands**:
- `get_user_settings`
- `update_user_profile`
- `update_user_preferences`
- `update_user_security`
- `update_user_performance`
- `update_user_accessibility`
- `update_user_notifications`
- `change_user_password`
- `upload_user_avatar`

### 11. Offline Sync

#### FR-11.1: Sync Queue
**Identified in**: `src-tauri/src/db/schema.sql` (sync_queue table), sync services

**Queue Operations**:
- Create, Update, Delete operations
- Entity types: task, client, intervention, photo
- Priority-based processing (1-10)
- Retry logic with exponential backoff
- Dependency tracking

**Queue Status**:
- pending: Waiting to sync
- processing: Currently syncing
- completed: Successfully synced
- failed: Sync failed
- abandoned: Max retries exceeded

**Commands**:
- `sync_enqueue`: Add to queue
- `sync_dequeue_batch`: Get batch for processing
- `sync_get_metrics`: Queue statistics
- `sync_mark_completed`: Mark as synced
- `sync_mark_failed`: Mark as failed
- `sync_get_operation`: Get operation details
- `sync_cleanup_old_operations`: Cleanup

#### FR-11.2: Background Sync Service
**Identified in**: Sync service implementation

- Automatic background synchronization
- Configurable sync interval
- Network status detection
- Conflict resolution

**Commands**:
- `sync_start_background_service`: Start service
- `sync_stop_background_service`: Stop service
- `sync_now`: Manual sync trigger
- `sync_get_status`: Get sync status
- `sync_get_operations_for_entity`: Get entity operations

### 12. Security & Audit

#### FR-12.1: Audit Logging
**Identified in**: `src-tauri/src/db/schema.sql` (audit_logs table), audit service

**Logged Events**:
- User authentication (login, logout)
- Data modifications (create, update, delete)
- Settings changes
- Security events
- System events

**Audit Data**:
- User ID and email
- Action performed
- Entity type and ID
- Old and new values (JSON)
- IP address, user agent
- Device ID
- Timestamp

**Command**: Audit logging is automatic, integrated into services

#### FR-12.2: Security Monitoring
**Identified in**: `src-tauri/src/services/security_monitor.rs`

**Security Metrics**:
- Failed login attempts
- Session activity
- Suspicious patterns
- Access violations

**Security Events**:
- Failed authentication
- Unauthorized access attempts
- Session anomalies
- Configuration changes

**Commands**:
- `get_security_metrics`: Get metrics
- `get_security_events`: Get events
- `get_security_alerts`: Get alerts
- `acknowledge_security_alert`: Acknowledge alert
- `resolve_security_alert`: Resolve alert
- `cleanup_security_events`: Cleanup old events

#### FR-12.3: Session Management
**Identified in**: Session repository and service

- Active session tracking
- Session timeout enforcement
- Multi-device session management
- Session revocation

**Commands**:
- `get_active_sessions`: List sessions
- `revoke_session`: Revoke specific session
- `revoke_all_sessions_except_current`: Revoke others
- `update_session_timeout`: Update timeout
- `get_session_timeout_config`: Get configuration

### 13. System Administration

#### FR-13.1: System Diagnostics
**Identified in**: `src-tauri/src/commands/system.rs`

- Health checks
- Database diagnostics
- Performance metrics
- Cache statistics

**Commands**:
- `health_check`: System health
- `diagnose_database`: Database diagnostics
- `get_database_stats`: Database statistics
- `get_database_pool_health`: Connection pool health
- `get_app_info`: Application information
- `get_device_info`: Device information

#### FR-13.2: Performance Monitoring
**Identified in**: Performance service

- Query performance tracking
- Cache hit rates
- Memory usage
- Connection pool utilization

**Commands**:
- `get_performance_stats`: Performance statistics
- `get_performance_metrics`: Detailed metrics
- `cleanup_performance_metrics`: Cleanup old metrics
- `get_cache_statistics`: Cache stats
- `clear_application_cache`: Clear cache
- `configure_cache_settings`: Configure cache

#### FR-13.3: Database Maintenance
**Identified in**: Database utilities

- VACUUM operation
- WAL checkpoint
- Integrity checks
- Index optimization

**Command**: `vacuum_database`

### 14. Real-time Features

#### FR-14.1: WebSocket Server
**Identified in**: `src-tauri/src/services/websocket.rs`, WebSocket commands

**Real-time Updates**:
- Task updates
- Intervention progress
- Client changes
- System notifications

**WebSocket Features**:
- Broadcast to all clients
- Send to specific client
- Connection management
- Statistics tracking

**Commands**:
- `init_websocket_server`: Initialize server
- `broadcast_websocket_message`: Broadcast message
- `send_websocket_message_to_client`: Send to client
- `get_websocket_stats`: Get statistics
- `shutdown_websocket_server`: Shutdown server
- `broadcast_task_update`: Broadcast task update
- `broadcast_intervention_update`: Broadcast intervention update
- `broadcast_client_update`: Broadcast client update
- `broadcast_system_notification`: Broadcast notification

## Non-Functional Requirements

### NFR-1: Performance

**Identified in**: Performance optimizations throughout codebase

- **Database Query Performance**: < 100ms for 95% of queries
- **UI Responsiveness**: < 200ms for user interactions
- **Startup Time**: < 5 seconds
- **Memory Usage**: < 500MB under normal load
- **Connection Pool**: Dynamic sizing based on load
- **Caching**: LRU cache with configurable size

**Implementation**:
- Prepared statement caching
- Query performance monitoring
- Batch operations for bulk data
- Virtual scrolling for large lists
- Code splitting and lazy loading

### NFR-2: Offline Capability

**Identified in**: Offline-first architecture

- **100% Offline Functionality**: All core features work offline
- **Data Persistence**: SQLite local database
- **Sync Queue**: Automatic synchronization when online
- **Conflict Resolution**: Last-write-wins with version tracking
- **Photo Storage**: Local file system storage

### NFR-3: Scalability

**Identified in**: Database schema and indexing

- **Database Size**: Support up to 1M records per table
- **Concurrent Users**: Support 50+ concurrent sessions
- **Photo Storage**: Efficient file organization
- **Index Optimization**: 26 migrations focused on performance

**Database Indexes**:
- Composite indexes for common query patterns
- Partial indexes for filtered queries
- Full-text search indexes

### NFR-4: Security

**Identified in**: Security implementations

- **Password Security**: Argon2 hashing (memory-hard)
- **Token Security**: JWT with short expiration
- **Database Encryption**: Optional SQLCipher support
- **Session Security**: Timeout and revocation
- **Audit Trail**: Complete action logging
- **2FA**: TOTP-based two-factor authentication

### NFR-5: Reliability

**Identified in**: Error handling and recovery

- **Database Transactions**: ACID compliance
- **Error Recovery**: Automatic retry with exponential backoff
- **Data Validation**: Input validation at multiple layers
- **Backup Support**: Database backup functionality
- **WAL Mode**: Crash recovery

### NFR-6: Usability

**Identified in**: Frontend implementation

- **Responsive Design**: Works on various screen sizes
- **Accessibility**: WCAG 2.1 AA compliance (target)
- **Internationalization**: Multi-language support (French primary)
- **Theme Support**: Light, dark, system themes
- **Keyboard Navigation**: Full keyboard support

### NFR-7: Maintainability

**Identified in**: Code organization and documentation

- **Code Organization**: 4-tier layered architecture
- **Type Safety**: Rust + TypeScript with generated types
- **Testing**: Unit tests, integration tests, E2E tests
- **Documentation**: Inline documentation and external docs
- **Code Quality**: Linting (Clippy, ESLint), formatting

## Technical Constraints

### TC-1: Technology Stack

**Identified in**: Cargo.toml, package.json

- **Rust Version**: >= 1.77
- **Node.js Version**: >= 18.0.0
- **Database**: SQLite 3.x
- **Desktop Framework**: Tauri 2.1
- **Frontend Framework**: Next.js 14.2

### TC-2: Platform Support

**Identified in**: tauri.conf.json

- **Windows**: Windows 10+
- **macOS**: macOS 10.15+
- **Linux**: Modern distributions with GTK3

### TC-3: Database

**Identified in**: Database configuration

- **Engine**: SQLite with bundled version
- **Journal Mode**: WAL (Write-Ahead Logging)
- **Foreign Keys**: Enabled
- **Encryption**: Optional SQLCipher support (feature flag)

### TC-4: Build & Deployment

**Identified in**: Build configuration

- **Bundle Formats**: MSI (Windows), DMG (macOS), AppImage (Linux)
- **Code Signing**: Certificate support
- **Auto-updates**: Tauri updater plugin
- **Asset Optimization**: Image optimization, code minification

## Data Models Summary

### Core Entities

1. **Users**: Authentication, roles, preferences
2. **Clients**: Customer information, statistics
3. **Tasks**: Work orders, scheduling, assignment
4. **Interventions**: PPF-specific work records
5. **Intervention Steps**: Workflow step details
6. **Photos**: Image documentation
7. **Materials**: Inventory items
8. **Material Consumption**: Usage tracking
9. **Calendar Events**: Scheduling events
10. **Messages**: Internal communication
11. **Notifications**: Alert system
12. **Sync Queue**: Offline synchronization
13. **Audit Logs**: Activity tracking
14. **User Sessions**: Session management
15. **User Settings**: User preferences

## Third-Party Integrations

### Current Integrations

**Identified in**: Dependencies and services

1. **Tauri**: Desktop application framework
2. **Next.js**: Web framework
3. **Radix UI**: Component library
4. **TailwindCSS**: Styling framework
5. **TanStack Query**: Data fetching and caching
6. **Recharts**: Data visualization
7. **Leaflet**: Mapping and geolocation

### Planned Integrations

**Identified in**: Code comments and TODOs

1. **Email Service**: SMTP for notifications
2. **SMS Service**: SMS notifications
3. **Cloud Storage**: Photo backup
4. **Payment Gateway**: Invoice processing
5. **External APIs**: Vehicle data lookup

## User Stories

### Technician User Stories

1. **As a technician**, I want to view my assigned tasks for the day, so I can plan my work schedule
2. **As a technician**, I want to start a PPF intervention from a task, so I can begin the installation process
3. **As a technician**, I want to capture photos at each step, so I can document my work
4. **As a technician**, I want to record material usage, so inventory is accurately tracked
5. **As a technician**, I want to work offline, so I'm not dependent on internet connectivity
6. **As a technician**, I want to see step-by-step instructions, so I follow the correct procedure
7. **As a technician**, I want to capture customer signature, so I have proof of completion

### Supervisor User Stories

1. **As a supervisor**, I want to view team performance metrics, so I can identify areas for improvement
2. **As a supervisor**, I want to approve completed interventions, so quality is maintained
3. **As a supervisor**, I want to reassign tasks, so workload is balanced
4. **As a supervisor**, I want to generate reports, so I can analyze business performance
5. **As a supervisor**, I want to monitor real-time progress, so I can provide timely support

### Admin User Stories

1. **As an admin**, I want to create user accounts, so team members can access the system
2. **As an admin**, I want to configure system settings, so the application meets business needs
3. **As an admin**, I want to manage material inventory, so stock levels are maintained
4. **As an admin**, I want to view audit logs, so I can track system usage
5. **As an admin**, I want to backup the database, so data is protected

### Client-Facing User Stories

1. **As a client**, I want to receive notifications about my appointment, so I'm informed of the schedule
2. **As a client**, I want to view photos of the completed work, so I can see the quality
3. **As a client**, I want to provide feedback, so the business knows my satisfaction level

## Gaps & Inconsistencies

### Identified Gaps

1. **Photo Upload Service**: Photo quality assessment is defined in the model but not fully implemented
2. **Email Integration**: Email notification configuration exists but SMTP integration is pending
3. **SMS Integration**: SMS notifications are planned but not implemented
4. **Cloud Sync**: Sync queue exists but cloud backend integration is not implemented
5. **Conflict Resolution UI**: Automatic conflict resolution exists but manual UI is missing
6. **Recurring Events**: Calendar supports events but recurrence is not implemented
7. **Payment Processing**: Invoice models exist but payment gateway integration is missing
8. **Vehicle Data Lookup**: VIN field exists but external API integration is missing

### Identified Inconsistencies

1. **Type Drift**: Some Rust types may drift from TypeScript types (mitigated by ts-rs)
2. **Migration Gaps**: Migrations jump from 025 to 027 (026 exists in root migrations folder)
3. **Command Registration**: Some commands are commented out in main.rs (TODOs)
4. **Feature Flags**: SQLCipher feature exists but is not enabled by default

## Improvement Suggestions

### Performance Improvements

1. **Implement Photo Compression**: Reduce storage and sync bandwidth
2. **Add Query Result Caching**: Cache frequently accessed data
3. **Optimize Bundle Size**: Further code splitting and tree shaking
4. **Implement Virtual Scrolling**: For all large lists
5. **Add Service Worker**: For better offline experience

### Feature Enhancements

1. **Advanced Search**: Implement Elasticsearch or similar for complex queries
2. **Mobile App**: Companion mobile app for technicians
3. **Customer Portal**: Web portal for clients to view their interventions
4. **AI Quality Assessment**: Automated photo quality scoring
5. **Predictive Maintenance**: ML-based prediction for material needs
6. **Voice Commands**: Hands-free operation for technicians
7. **AR Guidance**: Augmented reality for installation guidance

### Security Enhancements

1. **Hardware Security Keys**: Support for FIDO2/WebAuthn
2. **Biometric Authentication**: Fingerprint/face recognition
3. **End-to-End Encryption**: For sensitive data
4. **Role-Based Field Encryption**: Encrypt sensitive fields by role
5. **Security Scanning**: Automated vulnerability scanning

### Usability Improvements

1. **Onboarding Tutorial**: Interactive guide for new users
2. **Contextual Help**: In-app help system
3. **Keyboard Shortcuts**: Comprehensive shortcut system
4. **Customizable Dashboard**: User-configurable widgets
5. **Dark Mode Optimization**: Better dark mode color palette
6. **Accessibility Audit**: WCAG 2.1 AAA compliance

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Status**: Active Development
