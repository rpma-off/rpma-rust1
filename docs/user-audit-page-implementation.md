# User Activity Audit Page Implementation Plan

## Overview

This document outlines the implementation plan for adding a user activity audit page to the RPMA frontend. The page will allow administrators to view all activity of a user across all application services.

## Requirements Summary

| Requirement | Decision |
|-------------|----------|
| **Access Control** | Admin only |
| **Filters** | Date range + Event type + Resource type |
| **User Selection** | Both approaches: dedicated page for all users, and link from user profile |
| **State Changes** | Description only (no before/after diff display) |

---

## Architecture Context

### Existing Backend Infrastructure

| Component | Location | Purpose |
|-----------|----------|---------|
| `AuditService` | `src-tauri/src/shared/logging/audit_service.rs` | Core audit logging service |
| `AuditRepository` | `src-tauri/src/shared/logging/audit_repository.rs` | Full-featured repository with search |
| `AuditQuery` | `src-tauri/src/shared/logging/audit_repository.rs` | Query struct with filters |
| `AuditEventType` | `src-tauri/src/shared/logging/audit_types.rs` | Enum of all event types |
| `AuditLog` | `src-tauri/src/shared/logging/audit_repository.rs` | Entity struct |
| `AuditRepository` (auth domain) | `src-tauri/src/domains/auth/infrastructure/audit_repository.rs` | Security-focused queries |
| `audit_security_ipc.rs` | `src-tauri/src/domains/auth/ipc/audit_security_ipc.rs` | Existing IPC commands |

### Existing Frontend Infrastructure

| Component | Location | Purpose |
|-----------|----------|---------|
| `audit.ipc.ts` | `frontend/src/domains/admin/ipc/audit.ipc.ts` | Security audit IPC client |
| `SecurityDashboard.tsx` | `frontend/src/domains/admin/components/SecurityDashboard.tsx` | Security alerts view |
| `useSecurityDashboard.ts` | `frontend/src/domains/admin/hooks/useSecurityDashboard.ts` | Hook for security data |
| Types | `frontend/src/lib/backend.ts` | Generated types including SecurityEventRecord |

### Database Schema

```sql
CREATE TABLE audit_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_id TEXT,
    resource_type TEXT,
    description TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    result TEXT NOT NULL,
    previous_state TEXT,
    new_state TEXT,
    timestamp INTEGER NOT NULL,
    metadata TEXT,
    session_id TEXT,
    request_id TEXT,
    created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Indexes
CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
```

---

## Implementation Steps

### Phase 1: Backend IPC Commands

#### Step 1.1: Add Response DTOs

**File:** `src-tauri/src/domains/auth/application/audit_service.rs`

Add new DTOs with `#[derive(TS)]` for TypeScript export:

```rust
/// User activity record for the audit page.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct UserActivityRecord {
    pub id: String,
    pub user_id: String,
    pub username: String,
    pub event_type: String,
    pub action: String,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub description: String,
    pub result: String,
    pub timestamp: String,
    pub ip_address: Option<String>,
}

/// Filter parameters for activity queries.
#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct AuditActivityFilter {
    pub user_id: Option<String>,
    pub event_type: Option<String>,
    pub resource_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Paginated response for activity queries.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct PaginatedUserActivity {
    pub records: Vec<UserActivityRecord>,
    pub total: i64,
    pub has_more: bool,
}
```

#### Step 1.2: Add Service Methods

**File:** `src-tauri/src/domains/auth/application/audit_service.rs`

Add methods to `AuditService`:

```rust
impl AuditService {
    /// Get activity for a specific user with optional filters.
    pub fn get_user_activity(&self, user_id: &str, filter: AuditActivityFilter) -> Result<PaginatedUserActivity, String> {
        // Implementation using AuditRepository
    }

    /// Get activity across all users with optional filters.
    pub fn get_all_activity(&self, filter: AuditActivityFilter) -> Result<PaginatedUserActivity, String> {
        // Implementation using AuditRepository
    }

    /// Resolve user_id to username for display.
    fn resolve_username(&self, user_id: &str) -> String {
        // Query users table
    }
}
```

#### Step 1.3: Add IPC Commands

**File:** `src-tauri/src/domains/auth/ipc/audit_security_ipc.rs`

Add new Tauri commands:

```rust
/// Get activity for a specific user.
/// ADR-018: Admin-only endpoint.
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_user_activity(
    user_id: String,
    filter: Option<AuditActivityFilter>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<PaginatedUserActivity>, AppError> {
    // Implementation
}

/// Get activity across all users with optional filters.
/// ADR-018: Admin-only endpoint.
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_all_user_activity(
    filter: Option<AuditActivityFilter>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<PaginatedUserActivity>, AppError> {
    // Implementation
}

/// Get available event types for filter dropdown.
/// ADR-018: Admin-only endpoint.
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_audit_event_types(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<String>>, AppError> {
    // Return all AuditEventType variants
}
```

#### Step 1.4: Register Commands

**File:** `src-tauri/src/main.rs`

Add new commands to the invoke_handler:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    get_user_activity,
    get_all_user_activity,
    get_audit_event_types,
])
```

---

### Phase 2: Type Synchronization

#### Step 2.1: Run Type Sync

```bash
npm run types:sync
```

This generates TypeScript types in `frontend/src/lib/backend.ts`:
- `UserActivityRecord`
- `AuditActivityFilter`
- `PaginatedUserActivity`

---

### Phase 3: Frontend IPC Layer

#### Step 3.1: Add Command Constants

**File:** `frontend/src/lib/ipc/commands.ts`

Add to the `IPC_COMMANDS` object:

```typescript
export const IPC_COMMANDS = {
  // ... existing commands
  GET_USER_ACTIVITY: 'get_user_activity',
  GET_ALL_USER_ACTIVITY: 'get_all_user_activity',
  GET_AUDIT_EVENT_TYPES: 'get_audit_event_types',
} as const;
```

#### Step 3.2: Extend Audit IPC Client

**File:** `frontend/src/domains/admin/ipc/audit.ipc.ts`

```typescript
import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export interface AuditActivityFilter {
  user_id?: string;
  event_type?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export const auditIpc = {
  // Existing methods
  getMetrics: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_METRICS, {}),

  getEvents: (limit: number) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_EVENTS, { limit }),

  getAlerts: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_ALERTS, {}),

  acknowledgeAlert: (alertId: string) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.ACKNOWLEDGE_SECURITY_ALERT, { alert_id: alertId }),

  // New methods
  getUserActivity: (userId: string, filter?: AuditActivityFilter) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_USER_ACTIVITY, { user_id: userId, filter }),

  getAllUserActivity: (filter?: AuditActivityFilter) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_ALL_USER_ACTIVITY, { filter }),

  getAuditEventTypes: () =>
    safeInvoke<string[]>(IPC_COMMANDS.GET_AUDIT_EVENT_TYPES, {}),
};
```

---

### Phase 4: Frontend Query Keys

#### Step 4.1: Add Audit Query Keys

**File:** `frontend/src/lib/query-keys.ts`

```typescript
export const auditKeys = {
  all: ['audit'] as const,
  metrics: () => [...auditKeys.all, 'metrics'] as const,
  alerts: () => [...auditKeys.all, 'alerts'] as const,
  events: () => [...auditKeys.all, 'events'] as const,
  eventTypes: () => [...auditKeys.all, 'eventTypes'] as const,
  userActivity: (userId: string, filters?: AuditActivityFilter) => 
    [...auditKeys.all, 'userActivity', userId, filters] as const,
  allActivity: (filters?: AuditActivityFilter) => 
    [...auditKeys.all, 'allActivity', filters] as const,
} as const;
```

---

### Phase 5: Frontend Hooks

#### Step 5.1: Create User Activity Hook

**File:** `frontend/src/domains/admin/hooks/useUserActivity.ts`

```typescript
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipc';
import { auditKeys } from '@/lib/query-keys';
import { useAuth } from '@/shared/hooks/useAuth';

export interface AuditActivityFilter {
  user_id?: string;
  event_type?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface UserActivityRecord {
  id: string;
  user_id: string;
  username: string;
  event_type: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  description: string;
  result: string;
  timestamp: string;
  ip_address: string | null;
}

export interface PaginatedUserActivity {
  records: UserActivityRecord[];
  total: number;
  has_more: boolean;
}

export interface UseUserActivityOptions {
  userId?: string;
  filters?: AuditActivityFilter;
  enabled?: boolean;
}

export function useUserActivity(options: UseUserActivityOptions = {}) {
  const { userId, filters, enabled = true } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryEnabled = enabled && !!user?.token && !!userId;

  const query = useQuery({
    queryKey: auditKeys.userActivity(userId ?? '', filters),
    queryFn: () => ipcClient.audit.getUserActivity(userId!, filters),
    enabled: queryEnabled,
    staleTime: 30_000,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: auditKeys.userActivity(userId ?? '') 
    });
  }, [queryClient, userId]);

  return {
    data: query.data as PaginatedUserActivity | null | undefined,
    records: useMemo(() => 
      (query.data as PaginatedUserActivity | null | undefined)?.records ?? [], 
      [query.data]
    ),
    total: (query.data as PaginatedUserActivity | null | undefined)?.total ?? 0,
    hasMore: (query.data as PaginatedUserActivity | null | undefined)?.has_more ?? false,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
}

export function useAllUserActivity(filters?: AuditActivityFilter) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: auditKeys.allActivity(filters),
    queryFn: () => ipcClient.audit.getAllUserActivity(filters),
    enabled: !!user?.token,
    staleTime: 30_000,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: auditKeys.allActivity() });
  }, [queryClient]);

  return {
    data: query.data as PaginatedUserActivity | null | undefined,
    records: useMemo(() => 
      (query.data as PaginatedUserActivity | null | undefined)?.records ?? [], 
      [query.data]
    ),
    total: (query.data as PaginatedUserActivity | null | undefined)?.total ?? 0,
    hasMore: (query.data as PaginatedUserActivity | null | undefined)?.has_more ?? false,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
}

export function useAuditEventTypes() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: auditKeys.eventTypes(),
    queryFn: () => ipcClient.audit.getAuditEventTypes(),
    enabled: !!user?.token,
    staleTime: 300_000, // 5 minutes
  });

  return {
    eventTypes: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
```

---

### Phase 6: Frontend Components

#### Step 6.1: Create Activity Filter Component

**File:** `frontend/src/domains/admin/components/ActivityFilterBar.tsx`

```typescript
'use client';

import React from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuditEventTypes } from '../hooks/useUserActivity';
import { AuditActivityFilter } from '../hooks/useUserActivity';

const RESOURCE_TYPES = [
  { value: 'task', label: 'Tasks' },
  { value: 'client', label: 'Clients' },
  { value: 'intervention', label: 'Interventions' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'quote', label: 'Quotes' },
  { value: 'user', label: 'Users' },
  { value: 'calendar', label: 'Calendar' },
];

export interface ActivityFilterBarProps {
  filters: AuditActivityFilter;
  onFiltersChange: (filters: AuditActivityFilter) => void;
  showUserFilter?: boolean;
}

export function ActivityFilterBar({ 
  filters, 
  onFiltersChange,
  showUserFilter = true,
}: ActivityFilterBarProps) {
  const { eventTypes, loading: eventTypesLoading } = useAuditEventTypes();

  const handleFilterChange = (key: keyof AuditActivityFilter, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-[hsl(var(--rpma-surface))] rounded-lg border">
      {showUserFilter && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">User ID</label>
          <Input
            placeholder="Enter user ID"
            value={filters.user_id ?? ''}
            onChange={(e) => handleFilterChange('user_id', e.target.value || undefined)}
            className="w-48"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Event Type</label>
        <Select
          value={filters.event_type ?? ''}
          onValueChange={(value) => handleFilterChange('event_type', value || undefined)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All events</SelectItem>
            {eventTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {formatEventType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Resource Type</label>
        <Select
          value={filters.resource_type ?? ''}
          onValueChange={(value) => handleFilterChange('resource_type', value || undefined)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All resources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All resources</SelectItem>
            {RESOURCE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Start Date</label>
        <DatePicker
          date={filters.start_date ? new Date(filters.start_date) : undefined}
          onDateChange={(date) => handleFilterChange('start_date', date?.toISOString())}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">End Date</label>
        <DatePicker
          date={filters.end_date ? new Date(filters.end_date) : undefined}
          onDateChange={(date) => handleFilterChange('end_date', date?.toISOString())}
        />
      </div>

      <div className="flex items-end">
        <Button variant="outline" onClick={clearFilters}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
}

function formatEventType(type: string): string {
  return type
    .split(/(?=[A-Z])/)
    .join(' ')
    .replace(/^(\w)/, (_, c) => c.toUpperCase());
}
```

#### Step 6.2: Create Activity Table Component

**File:** `frontend/src/domains/admin/components/UserActivityTable.tsx`

```typescript
'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/shared/utils/date-formatters';
import { UserActivityRecord } from '../hooks/useUserActivity';

const RESULT_COLORS: Record<string, string> = {
  Success: 'bg-green-100 text-green-800',
  Failure: 'bg-red-100 text-red-800',
  Partial: 'bg-yellow-100 text-yellow-800',
  Cancelled: 'bg-gray-100 text-gray-800',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  TaskCreated: 'bg-blue-100 text-blue-800',
  TaskUpdated: 'bg-blue-100 text-blue-800',
  TaskDeleted: 'bg-blue-100 text-blue-800',
  ClientCreated: 'bg-purple-100 text-purple-800',
  ClientUpdated: 'bg-purple-100 text-purple-800',
  InterventionCreated: 'bg-orange-100 text-orange-800',
  AuthenticationSuccess: 'bg-green-100 text-green-800',
  AuthenticationFailure: 'bg-red-100 text-red-800',
};

export interface UserActivityTableProps {
  records: UserActivityRecord[];
  loading?: boolean;
  onRowClick?: (record: UserActivityRecord) => void;
}

export function UserActivityTable({ records, loading, onRowClick }: UserActivityTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading activity...</div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">No activity found</div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Resource</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Result</TableHead>
          <TableHead>IP Address</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow
            key={record.id}
            className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
            onClick={() => onRowClick?.(record)}
          >
            <TableCell className="text-sm">
              {formatDateTime(record.timestamp)}
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{record.username}</span>
                <span className="text-xs text-muted-foreground">{record.user_id}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                <Badge className={EVENT_TYPE_COLORS[record.event_type] ?? 'bg-gray-100 text-gray-800'}>
                  {formatEventType(record.event_type)}
                </Badge>
                <span className="text-xs text-muted-foreground">{record.action}</span>
              </div>
            </TableCell>
            <TableCell>
              {record.resource_type && (
                <div className="flex flex-col">
                  <span className="font-medium capitalize">{record.resource_type}</span>
                  {record.resource_id && (
                    <span className="text-xs text-muted-foreground truncate max-w-32" title={record.resource_id}>
                      {record.resource_id}
                    </span>
                  )}
                </div>
              )}
            </TableCell>
            <TableCell>
              <span className="text-sm line-clamp-2" title={record.description}>
                {record.description}
              </span>
            </TableCell>
            <TableCell>
              <Badge className={RESULT_COLORS[record.result] ?? 'bg-gray-100 text-gray-800'}>
                {record.result}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {record.ip_address ?? '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatEventType(type: string): string {
  return type
    .split(/(?=[A-Z])/)
    .join(' ');
}
```

#### Step 6.3: Create User Activity Page

**File:** `frontend/src/domains/admin/components/UserActivityPage.tsx`

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAllUserActivity, AuditActivityFilter } from '../hooks/useUserActivity';
import { ActivityFilterBar } from './ActivityFilterBar';
import { UserActivityTable } from './UserActivityTable';

const PAGE_SIZE = 50;

export function UserActivityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialUserId = searchParams.get('userId') ?? undefined;
  
  const [filters, setFilters] = useState<AuditActivityFilter>({
    user_id: initialUserId,
    limit: PAGE_SIZE,
    offset: 0,
  });
  
  const [page, setPage] = useState(0);
  
  const { records, total, hasMore, loading, error, refresh } = useAllUserActivity({
    ...filters,
    offset: page * PAGE_SIZE,
  });

  const handleFiltersChange = useCallback((newFilters: AuditActivityFilter) => {
    setFilters({ ...newFilters, limit: PAGE_SIZE });
    setPage(0);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowClick = useCallback((record: typeof records[0]) => {
    // Optionally navigate to resource detail
    if (record.resource_type && record.resource_id) {
      const route = getResourceRoute(record.resource_type);
      if (route) {
        router.push(`/${route}/${record.resource_id}`);
      }
    }
  }, [router]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
              User Activity Audit
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            showUserFilter={true}
          />
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card className="rpma-shell">
        <CardContent className="p-0">
          <UserActivityTable
            records={records}
            loading={loading}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} of {total} records
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => handlePageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
function getResourceRoute(resourceType: string): string | null {
  const routes: Record<string, string> = {
    task: 'tasks',
    client: 'clients',
    intervention: 'interventions',
    inventory: 'inventory',
    quote: 'quotes',
    user: 'admin/users',
    calendar: 'calendar',
  };
  return routes[resourceType] ?? null;
}
```

---

### Phase 7: Navigation & Integration

#### Step 7.1: Add to Admin Navigation

**File:** `frontend/src/domains/admin/components/AdminOverviewTab.tsx`

Add navigation link to User Activity page:

```typescript
// Add to navigation items array
{
  id: 'activity',
  label: 'User Activity Audit',
  icon: Activity,
  href: '/admin/activity',
}
```

#### Step 7.2: Add User Profile Link

**File:** `frontend/src/domains/admin/components/AdminUsersTab.tsx`

Add "View Activity" button to user row actions:

```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => router.push(`/admin/activity?userId=${user.id}`)}
>
  <Activity className="h-4 w-4 mr-1" />
  View Activity
</Button>
```

#### Step 7.3: Create Page Route

**File:** `frontend/src/app/admin/activity/page.tsx`

```typescript
import { UserActivityPage } from '@/domains/admin/components/UserActivityPage';

export default function ActivityPage() {
  return <UserActivityPage />;
}
```

---

## Testing Plan

### Backend Tests

1. **Unit Tests** (`src-tauri/src/domains/auth/tests/`)- Test `AuditService::get_user_activity()` with various filters
   - Test `AuditService::get_all_activity()` pagination
   - Test username resolution

2. **Integration Tests** (`src-tauri/tests/`)- Test IPC command authorization (admin only)
   - Test full query flow with real database
   - Test pagination and filtering

### Frontend Tests

1. **Component Tests** (`frontend/src/domains/admin/components/__tests__/`)- Test `ActivityFilterBar` filter changes
   - Test `UserActivityTable` rendering with various data
   - Test `UserActivityPage` pagination

2. **Hook Tests** (`frontend/src/domains/admin/hooks/__tests__/`)- Test `useUserActivity` query parameters
   - Test `useAllUserActivity` with filters
   - Test `useAuditEventTypes` caching

---

## Verification Checklist

### Backend
- [ ] `cargo check` passes
- [ ] `cargo test --test integration` passes
- [ ] `npm run types:sync` generates correct TypeScript types
- [ ] IPC commands appear in Tauri invoke handler

### Frontend
- [ ] `npm run frontend:type-check` passes
- [ ] `npm run frontend:lint` passes
- [ ] `npm run frontend:dev` loads without errors- [ ] Page renders correctly with data
- [ ] Filters work as expected
- [ ] Pagination works correctly
- [ ] Navigation from user profile works

---

## File Summary

| File | Action |
|------|--------|
| `src-tauri/src/domains/auth/application/audit_service.rs` | Modify |
| `src-tauri/src/domains/auth/ipc/audit_security_ipc.rs` | Modify |
| `src-tauri/src/main.rs` | Modify |
| `frontend/src/lib/ipc/commands.ts` | Modify |
| `frontend/src/domains/admin/ipc/audit.ipc.ts` | Modify |
| `frontend/src/lib/query-keys.ts` | Modify |
| `frontend/src/domains/admin/hooks/useUserActivity.ts` | Create |
| `frontend/src/domains/admin/components/ActivityFilterBar.tsx` | Create |
| `frontend/src/domains/admin/components/UserActivityTable.tsx` | Create |
| `frontend/src/domains/admin/components/UserActivityPage.tsx` | Create |
| `frontend/src/app/admin/activity/page.tsx` | Create |

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Backend IPC Commands | 2-3 hours |
| Type Sync | 15 minutes |
| Frontend IPC Layer | 30 minutes |
| Query Keys | 15 minutes |
| Frontend Hooks | 1 hour |
| Frontend Components | 3-4 hours |
| Navigation & Integration | 30 minutes |
| Testing | 2-3 hours |
| **Total** | **10-12 hours** |