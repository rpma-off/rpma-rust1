-- Migration: 023_add_messaging_tables.sql
-- Description: Add messaging system tables for message center functionality
-- Created: 2026-01-20

-- Create messages table for storing all messages (email, SMS, in-app)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    message_type TEXT NOT NULL CHECK (message_type IN ('email', 'sms', 'in_app')),
    sender_id TEXT, -- NULL for system messages
    recipient_id TEXT, -- For single recipient messages
    recipient_email TEXT, -- For email messages
    recipient_phone TEXT, -- For SMS messages
    subject TEXT,
    body TEXT NOT NULL,
    template_id TEXT, -- Reference to message_templates
    task_id TEXT, -- Associated task if applicable
    client_id TEXT, -- Associated client if applicable
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    scheduled_at INTEGER, -- For scheduled messages
    sent_at INTEGER,
    read_at INTEGER,
    error_message TEXT,
    metadata TEXT, -- JSON metadata
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL
);

-- Create indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_task_id ON messages(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_at ON messages(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Create message_templates table for reusable message templates
CREATE TABLE IF NOT EXISTS message_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    message_type TEXT NOT NULL CHECK (message_type IN ('email', 'sms', 'in_app')),
    subject TEXT, -- NULL for SMS templates
    body TEXT NOT NULL,
    variables TEXT, -- JSON array of variable names
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'task', 'client', 'system', 'reminder')),
    is_active BOOLEAN DEFAULT 1,
    created_by TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for message_templates table
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(message_type);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);

-- Create notification_preferences table for user notification settings
CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL UNIQUE,
    email_enabled BOOLEAN DEFAULT 1,
    sms_enabled BOOLEAN DEFAULT 0,
    in_app_enabled BOOLEAN DEFAULT 1,

    -- Task-related notifications
    task_assigned BOOLEAN DEFAULT 1,
    task_updated BOOLEAN DEFAULT 1,
    task_completed BOOLEAN DEFAULT 1,
    task_overdue BOOLEAN DEFAULT 1,

    -- Client-related notifications
    client_created BOOLEAN DEFAULT 1,
    client_updated BOOLEAN DEFAULT 1,

    -- System notifications
    system_alerts BOOLEAN DEFAULT 1,
    maintenance_notifications BOOLEAN DEFAULT 1,

    -- Quiet hours (in UTC)
    quiet_hours_enabled BOOLEAN DEFAULT 0,
    quiet_hours_start TEXT, -- HH:MM format
    quiet_hours_end TEXT, -- HH:MM format

    -- Email settings
    email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly')),
    email_digest_time TEXT DEFAULT '09:00', -- HH:MM format

    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for notification_preferences table
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Insert some default message templates
INSERT OR IGNORE INTO message_templates (name, description, message_type, subject, body, variables, category) VALUES
('Task Assigned', 'Notification when a task is assigned to a technician', 'email',
 'New Task Assigned: {{task_number}}',
 'Hello {{technician_name}},

You have been assigned a new task:

Task: {{task_number}} - {{task_title}}
Client: {{client_name}}
Vehicle: {{vehicle_plate}} {{vehicle_model}}
Scheduled: {{scheduled_date}} {{start_time}}
Priority: {{priority}}

Please review the task details and begin work as scheduled.

Best regards,
RPMA System',
 '["technician_name", "task_number", "task_title", "client_name", "vehicle_plate", "vehicle_model", "scheduled_date", "start_time", "priority"]', 'task'),

('Task Completed', 'Notification when a task is marked as completed', 'email',
 'Task Completed: {{task_number}}',
 'Hello,

Task {{task_number}} - {{task_title}} has been completed.

Technician: {{technician_name}}
Completed: {{completed_at}}

Thank you for using RPMA services.

Best regards,
RPMA System',
 '["task_number", "task_title", "technician_name", "completed_at"]', 'task'),

('Task Overdue Reminder', 'Reminder for overdue tasks', 'sms',
 NULL,
 'URGENT: Task {{task_number}} - {{task_title}} is overdue. Please complete immediately. Client: {{client_name}}',
 '["task_number", "task_title", "client_name"]', 'reminder');

-- Insert default notification preferences for existing users
INSERT OR IGNORE INTO notification_preferences (user_id)
SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM notification_preferences);