-- Migration 026: Add performance optimization indexes
-- This migration adds composite indexes identified in the performance audit

-- Critical composite indexes for task query performance
CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_technician_date ON tasks(technician_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created_desc ON tasks(status, created_at DESC);

-- Additional performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks(client_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_technician_status_date ON tasks(technician_id, status, scheduled_date);

-- Intervention query optimization indexes
CREATE INDEX IF NOT EXISTS idx_interventions_task_status ON interventions(task_id, status);
CREATE INDEX IF NOT EXISTS idx_interventions_status_created ON interventions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_interventions_technician_status ON interventions(technician_id, status);

-- Photo management performance indexes
CREATE INDEX IF NOT EXISTS idx_photos_intervention_step ON photos(intervention_id, step_id);
CREATE INDEX IF NOT EXISTS idx_photos_step_status ON photos(step_id, status);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);

-- Client query optimization
CREATE INDEX IF NOT EXISTS idx_clients_name_email ON clients(name, email);
CREATE INDEX IF NOT EXISTS idx_clients_active_created ON clients(is_active, created_at DESC);

-- User activity tracking
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(is_active, role);

-- Sync queue optimization
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created ON sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity_created ON sync_queue(entity_type, entity_id, created_at);

-- Workflow optimization
CREATE INDEX IF NOT EXISTS intervention_steps_intervention_status ON intervention_steps(intervention_id, step_status);
CREATE INDEX IF NOT EXISTS intervention_steps_created_at ON intervention_steps(created_at DESC);