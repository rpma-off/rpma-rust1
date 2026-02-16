# Correlation Tracing - Visual Examples

## Example 1: Successful Client Creation

### User Action
User clicks "Create Client" button in the UI and fills in the form:
- Name: "Acme Corporation"
- Email: "contact@acme.com"
- Type: "Business"

### Frontend Logs
```javascript
[INFO] [API] IPC call started: client_crud
  correlation_id: req-m7x4k9-0001-zyx789
  command: client_crud
  args: { action: "Create", ... }
  timeout_ms: 120000

[INFO] [API] IPC call completed: client_crud
  correlation_id: req-m7x4k9-0001-zyx789
  duration_ms: 187
  response_type: Object
```

### Backend Logs
```rust
[INFO] client_crud command received - action: Create
  correlation_id: req-m7x4k9-0001-zyx789

[DEBUG] Authentication successful
  correlation_id: req-m7x4k9-0001-zyx789
  user_id: user-123
  role: Admin

[INFO] Creating new client
  correlation_id: req-m7x4k9-0001-zyx789
  user_id: user-123
  customer_type: Business
  has_email: true
  has_phone: false

[DEBUG] Saving client to repository
  correlation_id: req-m7x4k9-0001-zyx789
  user_id: user-123
  client_id: client-abc-456
  client_name: Acme Corporation

[DEBUG] Creating new client
  correlation_id: req-m7x4k9-0001-zyx789
  user_id: user-123
  client_id: client-abc-456
  client_name: Acme Corporation
  operation: create

[INFO] Client saved successfully
  correlation_id: req-m7x4k9-0001-zyx789
  user_id: user-123
  client_id: client-abc-456
  client_name: Acme Corporation
  is_update: false

[INFO] Client created successfully
  correlation_id: req-m7x4k9-0001-zyx789
  user_id: user-123
  client_id: client-abc-456
  client_name: Acme Corporation

[INFO] Client created successfully with ID: client-abc-456
  correlation_id: req-m7x4k9-0001-zyx789
```

### User Sees
✅ Success toast: "Client créé avec succès"

---

## Example 2: Failed Client Creation (Validation Error)

### User Action
User tries to create client without required email

### Frontend Logs
```javascript
[INFO] [API] IPC call started: client_crud
  correlation_id: req-p3n8j2-0002-def456
  command: client_crud

[ERROR] [API] IPC call failed: client_crud
  correlation_id: req-p3n8j2-0002-def456
  error: Les données saisies ne sont pas valides.
  error_code: VALIDATION
  duration_ms: 23
```

### Backend Logs
```rust
[INFO] client_crud command received - action: Create
  correlation_id: req-p3n8j2-0002-def456

[ERROR] Validation error in client_crud
  correlation_id: req-p3n8j2-0002-def456
  error: Email validation failed: Email is required for business clients
  error_code: VALIDATION
```

### User Sees
❌ Error toast:
```
Les données saisies ne sont pas valides. 
Veuillez vérifier et réessayer.

ID de référence : req-p3n8j2...
```

**User can copy the ID and send to support**

---

## Example 3: Failed Client Creation (Database Error)

### User Action
User tries to create client but database is locked

### Frontend Logs
```javascript
[INFO] [API] IPC call started: client_crud
  correlation_id: req-t8q5w1-0003-ghi789
  command: client_crud

[ERROR] [API] IPC call failed: client_crud
  correlation_id: req-t8q5w1-0003-ghi789
  error: Erreur de base de données.
  error_code: DATABASE
  duration_ms: 5234
```

### Backend Logs
```rust
[INFO] client_crud command received - action: Create
  correlation_id: req-t8q5w1-0003-ghi789

[DEBUG] Authentication successful
  correlation_id: req-t8q5w1-0003-ghi789
  user_id: user-456

[INFO] Creating new client
  correlation_id: req-t8q5w1-0003-ghi789
  user_id: user-456
  customer_type: Business

[DEBUG] Saving client to repository
  correlation_id: req-t8q5w1-0003-ghi789
  user_id: user-456
  client_id: client-xyz-789

[DEBUG] Creating new client
  correlation_id: req-t8q5w1-0003-ghi789
  user_id: user-456
  client_id: client-xyz-789
  operation: create

[ERROR] Failed to create client
  correlation_id: req-t8q5w1-0003-ghi789
  user_id: user-456
  client_id: client-xyz-789
  error: Database error: database is locked

[ERROR] Failed to create client
  correlation_id: req-t8q5w1-0003-ghi789
  user_id: user-456
  error: Failed to create client: Database error: database is locked
```

### User Sees
❌ Error toast:
```
Erreur de base de données. 
Veuillez réessayer plus tard.

ID de référence : req-t8q5w1...
```

### Support Workflow
1. User contacts support: "I got error with ID: req-t8q5w1..."
2. Support searches logs: `grep "req-t8q5w1-0003-ghi789" logs/rpma.log`
3. Support finds complete trace showing database lock
4. Support identifies the issue and provides solution

---

## Example 4: User Login Flow

### User Action
User enters email and password, clicks "Sign In"

### Frontend Logs
```javascript
[DEBUG] [API] IPC call started: auth_login
  correlation_id: req-k2m9v7-0004-abc123
  command: auth_login
  args: { email: "user@example.com", /* password redacted */ }

[INFO] [API] IPC call completed: auth_login
  correlation_id: req-k2m9v7-0004-abc123
  duration_ms: 156
  response_type: Object
```

### Backend Logs
```rust
[INFO] auth_login
  correlation_id: req-k2m9v7-0004-abc123
  email: user@example.com

[DEBUG] Auth service acquired, attempting authentication
  correlation_id: req-k2m9v7-0004-abc123

[DEBUG] Authentication successful
  correlation_id: req-k2m9v7-0004-abc123
  user_id: user-789

[INFO] User session created
  correlation_id: req-k2m9v7-0004-abc123
  user_id: user-789
  session_id: session-xyz-123
```

### User Sees
✅ Redirected to dashboard, logged in successfully

---

## Example 5: Multiple Correlated Requests

### Scenario
User creates a client, then immediately creates a task for that client.
Both operations use the same correlation_id to show they're related.

### Frontend Code
```typescript
// Generate correlation ID for this workflow
const workflowCorrelationId = CorrelationContext.generateNew();

// Create client with specific correlation ID
const client = await safeInvoke('client_crud', {
  session_token: token,
  correlation_id: workflowCorrelationId,
  action: { Create: { data: clientData } }
});

// Create task for that client, using SAME correlation ID
const task = await safeInvoke('task_management', {
  session_token: token,
  correlation_id: workflowCorrelationId,  // Same ID!
  action: { Create: { data: { ...taskData, client_id: client.id } } }
});
```

### Logs Show Related Operations
```
[INFO] IPC call started: client_crud
  correlation_id: req-workflow-0005-def456

[INFO] Client created successfully
  correlation_id: req-workflow-0005-def456
  client_id: client-abc-123

[INFO] IPC call started: task_management
  correlation_id: req-workflow-0005-def456  // Same ID!

[INFO] Task created successfully
  correlation_id: req-workflow-0005-def456
  task_id: task-xyz-789
  client_id: client-abc-123
```

**Benefit**: Can trace entire workflow with single correlation_id!

---

## Example 6: Debugging Production Issue

### User Report
"I tried to create a client 10 minutes ago and got an error. 
My reference ID is: req-b4h6..."

### Support Investigation
```bash
# Search logs for correlation ID
grep "req-b4h6k8-0102-xyz456" /var/log/rpma/app.log

# Results show complete flow:
[INFO] client_crud started (correlation_id: req-b4h6k8-0102-xyz456)
[DEBUG] Authentication successful (user_id: user-321)
[INFO] Creating new client (customer_type: Individual)
[DEBUG] Saving client to repository (client_id: client-test-555)
[ERROR] Failed to create client (error: Unique constraint violation on email)
```

**Root Cause Found**: User tried to create duplicate email  
**Solution**: Support informs user that email already exists  
**Time to Resolution**: < 2 minutes using correlation_id

---

## Visual Flow Diagram

```
USER ACTION                    LOGS GENERATED
─────────────                  ──────────────

Click "Create"        ───────> [FRONTEND] IPC started
                                correlation_id: req-abc-123
        │
        │
        ▼
Enter form data       ───────> [FRONTEND] Validation passed
                                correlation_id: req-abc-123
        │
        │
        ▼
Submit form           ───────> [COMMAND] Received request
                                correlation_id: req-abc-123
        │
        │
        ▼
Backend processes     ───────> [COMMAND] Auth successful
                                correlation_id: req-abc-123
                                user_id: user-456
        │
        │
        ▼
Service creates       ───────> [SERVICE] Creating client
                                correlation_id: req-abc-123
                                user_id: user-456
        │
        │
        ▼
Repository saves      ───────> [REPO] Saving to DB
                                correlation_id: req-abc-123
                                client_id: client-789
        │
        │
        ▼
Database writes       ───────> [REPO] Save successful
                                correlation_id: req-abc-123
        │
        │
        ▼
Response returned     ───────> [COMMAND] Response prepared
                                correlation_id: req-abc-123
        │
        │
        ▼
Success shown         ───────> [FRONTEND] IPC completed
                                correlation_id: req-abc-123
                                duration_ms: 234
        │
        │
        ▼
✅ User sees success toast
```

**Key Insight**: Every line in the logs has the SAME correlation_id, making the complete flow easy to trace!

---

## Performance Monitoring Example

### Analyzing Request Performance

Using correlation_id, identify where time is spent:

```
[INFO] IPC call started: client_crud
  correlation_id: req-perf-test-001
  timestamp: 2024-01-15T10:30:00.000Z

[INFO] client_crud started
  correlation_id: req-perf-test-001
  timestamp: 2024-01-15T10:30:00.005Z  ← 5ms (network + IPC)

[DEBUG] Authentication successful
  correlation_id: req-perf-test-001
  timestamp: 2024-01-15T10:30:00.025Z  ← 20ms (auth check)

[INFO] Creating new client
  correlation_id: req-perf-test-001
  timestamp: 2024-01-15T10:30:00.030Z  ← 5ms (service start)

[DEBUG] Saving to repository
  correlation_id: req-perf-test-001
  timestamp: 2024-01-15T10:30:00.032Z  ← 2ms

[INFO] Client saved successfully
  correlation_id: req-perf-test-001
  timestamp: 2024-01-15T10:30:00.180Z  ← 148ms (DATABASE BOTTLENECK!)

[INFO] IPC call completed
  correlation_id: req-perf-test-001
  duration_ms: 185
  timestamp: 2024-01-15T10:30:00.185Z
```

**Analysis**: 148ms of 185ms total spent in database → optimize database query or add index

---

## Summary

Correlation tracing provides:

✅ **Complete visibility** into request flow  
✅ **Fast debugging** with single search  
✅ **User support** with reference IDs  
✅ **Performance analysis** with timestamps  
✅ **Production debugging** without guesswork  

All achieved with **minimal code changes** and **consistent patterns**.
