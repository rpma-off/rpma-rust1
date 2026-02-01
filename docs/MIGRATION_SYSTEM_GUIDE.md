# 🚀 RPMA Database Migration System - Current Implementation Guide

## Overview

The RPMA system includes automatic database migration management for schema updates. Migrations are applied automatically on application startup to ensure the database schema stays current. This guide covers the current migration implementation and maintenance procedures.

## 🏗️ Current System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin UI      │    │   System Commands│    │  Rust Backend   │
│                 │    │                  │    │                 │
│ • Basic System  │◄──►│ • Health Check   │◄──►│ • Auto Discovery │
│ • DB Stats      │    │ • DB Diagnostics │    │   of Migrations  │
│ • User Mgmt     │    │ • Basic Backup   │    │ • Auto Apply     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  ▼
                     ┌─────────────────────┐
                     │   SQLite Database   │
                     │                     │
                     │ • Dynamic Schema    │
                     │ • Integrity Checks  │
                     │ • Basic Backup      │
                     │ • WAL Mode          │
                     └─────────────────────┘
```

## 📦 Deployment

### Prerequisites

- **Node.js**: 18.0.0+
- **Rust**: 1.70.0+
- **SQLite**: 3.35.0+
- **Tauri**: 2.1.0+

### Installation

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd rpma-rust
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Set required environment variables
   JWT_SECRET=<secure-random-string>
   RPMA_DB_METRICS=1  # Enable database metrics
   ```

4. **Build Application**
   ```bash
   npm run build
   ```

### Database Setup

The system automatically handles database initialization and migrations on first run. Migrations are applied automatically during startup.

```bash
# Start the application - migrations run automatically on first startup
npm run dev

# Check system health (basic database connectivity)
# Use admin panel system diagnostics
```

## 🎮 Usage Guide

### Accessing System Information

1. **Login** as an administrator or supervisor
2. **Navigate** to the "System" tab in the admin panel
3. **Monitor** basic system health and database statistics

### Current Dashboard Features

#### System Health Overview
- **System Status**: Basic health check (database connectivity)
- **Database Size**: Current SQLite database file size
- **User/Task Counts**: Basic table statistics
- **Connection Pool**: Active and idle connections

#### Database Management
- **Database Diagnostics**: WAL mode, journal mode, integrity checks
- **Basic Backup**: Manual database backup functionality (limited availability)
- **Performance Info**: CPU and memory usage (basic)

### Available Operations

#### System Diagnostics
```bash
# Check system health via admin panel
# Navigate to Admin > System tab

# Database diagnostics available through system commands
# WAL checkpoint and integrity checks
```

#### Manual Operations
```bash
# Database backup (if enabled)
# Available through admin panel system tab

# View database statistics
# Available in admin panel system diagnostics
```

## 🔧 Administration

### User Roles & Permissions

| Role | System Access | Database Access | Monitoring |
|------|---------------|-----------------|------------|
| **Admin** | ✅ Full System Access | ✅ DB Stats & Diagnostics | ✅ Full Access |
| **Supervisor** | ✅ Limited System Access | ✅ DB Stats (Read-only) | ✅ Read Access |
| **User** | ❌ No System Access | ❌ No Access | ❌ No Access |

### Backup Strategy

#### Current Backup Capabilities
- **Manual Backup**: Basic database backup using SQLite VACUUM INTO
- **Limited Availability**: Backup functionality may be disabled in current build
- **No Automatic Backups**: Currently no scheduled or pre-migration backups

#### Manual Backup (If Available)
```bash
# Backup functionality through admin panel
# Navigate to Admin > System > Database section
# Click "Sauvegarder" button
```

#### Database Recovery
1. **Stop Application**
2. **Locate Backup File** (if created manually)
3. **Manual Restore** - Replace database file (requires technical knowledge)
4. **Restart Application**
5. **Verify Data Integrity** through admin diagnostics

### Monitoring & Diagnostics

#### Health Checks
- **Basic Health Check**: Database connectivity test
- **Manual**: Access via admin panel system diagnostics
- **No Automated Monitoring**: Currently manual only

#### Database Monitoring
- **Database Statistics**: Table counts, file size, connection pool status
- **Integrity Checks**: SQLite PRAGMA integrity_check
- **WAL Checkpoint**: Manual WAL checkpoint operations

## 🛠️ Maintenance

### Regular Tasks

#### Daily
```bash
# Basic system health check
# Use admin panel to check system status

# Database connectivity verification
# Available through admin diagnostics
```

#### Weekly
```bash
# Database integrity check
# Use admin panel system diagnostics

# Review database size and performance
# Check admin panel database statistics
```

#### Monthly
```bash
# Database maintenance
# Run WAL checkpoint if needed via diagnostics

# Review system logs for any database issues
# Check application logs for migration or database errors
```

### Performance Optimization

#### Database Optimization
- **WAL Mode**: SQLite Write-Ahead Logging enabled by default
- **Connection Pooling**: Basic r2d2 connection pool
- **Manual Maintenance**: WAL checkpoints available via diagnostics

#### Current Limitations
- **No Index Monitoring**: No automatic index optimization
- **No Query Analysis**: No slow query detection
- **Basic Pool Management**: Fixed pool size, no automatic adjustment

### Troubleshooting

#### Common Issues

**Migration Errors on Startup**
```bash
# Check application logs for migration errors
# Look for SQLite errors in console output

# Verify database file permissions
# Ensure write access to database directory

# Manual database integrity check
# Use admin panel diagnostics
```

**Database Performance Issues**
```bash
# Check WAL checkpoint status
# Use admin panel to run WAL checkpoint

# Review database size and growth
# Check admin panel database statistics

# Monitor connection pool status
# Available in system diagnostics
```

**Database Connectivity Issues**
```bash
# Verify database file exists and is accessible
# Check file permissions

# Run integrity check
# Use admin panel diagnostics

# Restart application if needed
# May resolve temporary connection issues
```

## 🔒 Security

### Access Control
- **Role-based Access**: Admin/supervisor only for migration operations
- **Audit Logging**: All operations logged with user context
- **Secure Backups**: Encrypted storage for sensitive environments

### Data Protection
- **Transaction Safety**: SQLite ACID compliance
- **Basic Integrity Checks**: Manual integrity validation available
- **No Backup Encryption**: Current backup is unencrypted

### Compliance
- **Audit Trails**: Complete logging of all migration activities
- **Data Retention**: Configurable backup retention policies
- **Access Logging**: User action tracking for compliance

## 📊 Monitoring & Metrics

### Current Metrics

| Metric | Current Status | Notes |
|--------|----------------|-------|
| Migration Success Rate | Automatic on startup | No failure tracking |
| Database Integrity | Manual checks available | No automated monitoring |
| System Health Score | Basic connectivity check | Limited health assessment |
| Backup Coverage | Manual only | No automated backups |

### Dashboard KPIs

- **System Health**: Basic database connectivity status
- **Database Size**: Current SQLite file size
- **Connection Pool**: Active/idle connection counts
- **Table Statistics**: Row counts for main tables

### Alerting

Currently no automated alerting system. Manual monitoring required for:
- Database connectivity issues
- Performance degradation
- Storage space warnings

## 🚀 Current Capabilities & Limitations

### Migration System
- **Automatic Discovery**: System automatically finds and orders SQL migration files
- **Dynamic Execution**: Auto-executes `NNN_*.sql` files without code changes
- **Embedded Resources**: SQL files are bundled into the binary using `include_dir`
- **Smart Fallback**: Preserves custom Rust logic while allowing generic SQL files
- **Version Tracking**: Migration versions tracked in database
- **No Rollback**: No automated rollback capabilities
- **Basic Logging**: Migration activity logged to console

### Testing & Validation
- **No Migration Tests**: No automated migration testing framework
- **Manual Verification**: Database integrity checks available
- **No CI/CD Integration**: No automated migration validation in build process

### Future Enhancements
The system is designed for basic schema management. Advanced features like rollback scripts, dependency management, and automated testing are not currently implemented.

## 📚 Available API Commands

### System Commands

#### Health & Diagnostics
```typescript
// Basic health check
health_check(): Promise<string>

// Database diagnostics
diagnose_database(): Promise<DatabaseDiagnostics>

// Database statistics
get_database_stats(): Promise<DatabaseStats>

// Force WAL checkpoint
force_wal_checkpoint(): Promise<string>
```

#### Basic Backup (Limited Availability)
```typescript
// Manual database backup (may be disabled)
perform_database_backup(): Promise<string>
```

### Data Types

```typescript
interface DatabaseStats {
  size_bytes: number;
  tables: {
    users: number;
    tasks: number;
    clients: number;
    interventions: number;
  };
  database_path: string;
}

interface DatabaseDiagnostics {
  journal_mode: string;
  wal_checkpoint: [number, number];
  busy_timeout_ms: number;
  integrity: string;
  table_counts: {
    tasks: number;
    clients: number;
  };
  pool_state: {
    connections: number;
    idle_connections: number;
  };
}
```

## 🎯 Best Practices

### Development
1. **Test Database Changes**: Verify schema changes work correctly
2. **Document Changes**: Include clear comments in migration code
3. **Version Control**: Migrations are automatically versioned
4. **Backup Before Changes**: Manual backup recommended before schema changes

### Operations
1. **Monitor System Health**: Use admin panel diagnostics regularly
2. **Manual Backups**: Create backups before major changes (if available)
3. **Verify Integrity**: Run integrity checks after issues
4. **Check Logs**: Monitor application logs for database errors

### Deployment
1. **Test in Development**: Verify changes work before production
2. **Backup Strategy**: Manual backup before deployments
3. **Monitor Startup**: Check logs for migration errors on first run
4. **Verify Functionality**: Test application after deployment

## 🆘 Support & Troubleshooting

### Getting Help

1. **Documentation**: Check this guide and inline code documentation
2. **Health Checks**: Run diagnostic commands to identify issues
3. **Logs**: Check application logs for detailed error information
4. **Dashboard**: Use the UI dashboard for visual diagnostics

### Common Support Scenarios

**Application Won't Start**
- Check database file permissions and disk space
- Verify SQLite database file is not corrupted
- Review application logs for startup errors

**Database Errors**
- Check database integrity using admin diagnostics
- Verify WAL checkpoint if database is locked
- Restart application to clear connection issues

**Performance Issues**
- Check database size and growth patterns
- Run WAL checkpoint to optimize performance
- Review connection pool status in diagnostics

**Data Issues**
- Use admin diagnostics to check table statistics
- Verify data integrity manually
- Check application logs for data-related errors

---

## 📈 Current System Status

The current migration system provides:

- **Automatic Migration Application**: Schema updates applied on startup
- **Basic Database Integrity**: Manual integrity checking available
- **Simple Backup Capability**: Manual database backup (limited availability)
- **System Monitoring**: Basic health checks and diagnostics
- **SQLite Optimization**: WAL mode and connection pooling

## 🚀 Future Enhancements

This guide describes the current basic migration system. For advanced features like automated rollbacks, comprehensive monitoring, and enterprise-grade backup management, additional development would be required to implement the full advanced migration system described in the original specification.

The current system provides reliable basic database management suitable for development and small-scale production use.