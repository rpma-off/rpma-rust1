-- Migration 025: Analytics dashboard tables
-- Adds tables for storing computed KPIs, metrics, and analytics data for dashboard

-- Table: analytics_kpis
-- Stores computed Key Performance Indicators for dashboard display
CREATE TABLE IF NOT EXISTS analytics_kpis (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  kpi_name TEXT NOT NULL UNIQUE,
  kpi_category TEXT NOT NULL
    CHECK(kpi_category IN ('operational', 'financial', 'quality', 'efficiency', 'client_satisfaction')),

  -- KPI Definition
  display_name TEXT NOT NULL,
  description TEXT,
  unit TEXT, -- 'percentage', 'currency', 'count', 'hours', etc.
  calculation_method TEXT NOT NULL,

  -- Value and Trends
  current_value REAL,
  previous_value REAL,
  target_value REAL,
  trend_direction TEXT
    CHECK(trend_direction IN ('up', 'down', 'stable', 'unknown')),

  -- Time periods
  last_calculated INTEGER,
  calculation_period TEXT DEFAULT 'daily'
    CHECK(calculation_period IN ('hourly', 'daily', 'weekly', 'monthly')),

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  priority INTEGER DEFAULT 0,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER
);

-- Indexes for analytics_kpis
CREATE INDEX IF NOT EXISTS idx_analytics_kpis_category ON analytics_kpis(kpi_category);
CREATE INDEX IF NOT EXISTS idx_analytics_kpis_active ON analytics_kpis(is_active);
CREATE INDEX IF NOT EXISTS idx_analytics_kpis_priority ON analytics_kpis(priority);

-- Table: analytics_metrics
-- Stores raw metrics data for charts and trend analysis
CREATE TABLE IF NOT EXISTS analytics_metrics (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL,

  -- Value
  value REAL NOT NULL,
  value_type TEXT NOT NULL
    CHECK(value_type IN ('count', 'percentage', 'currency', 'duration', 'rating')),

  -- Dimensions (for grouping/filtering)
  dimensions TEXT, -- JSON object with dimension keys/values

  -- Time
  timestamp INTEGER NOT NULL,
  period_start INTEGER,
  period_end INTEGER,

  -- Metadata
  source TEXT NOT NULL, -- 'intervention', 'task', 'material', 'client', etc.
  source_id TEXT, -- Reference to the source record

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0
);

-- Indexes for analytics_metrics
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_name ON analytics_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_category ON analytics_metrics(metric_category);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_timestamp ON analytics_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_source ON analytics_metrics(source);

-- Table: analytics_dashboards
-- Stores dashboard configurations and layouts
CREATE TABLE IF NOT EXISTS analytics_dashboards (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  dashboard_type TEXT NOT NULL DEFAULT 'main'
    CHECK(dashboard_type IN ('main', 'operational', 'financial', 'quality', 'custom')),

  -- Configuration
  layout_config TEXT, -- JSON layout configuration
  widget_configs TEXT, -- JSON array of widget configurations
  filters_config TEXT, -- JSON default filters

  -- Access Control
  user_id TEXT, -- NULL for global dashboards
  is_public INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Foreign Keys
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for analytics_dashboards
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_type ON analytics_dashboards(dashboard_type);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_user ON analytics_dashboards(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_active ON analytics_dashboards(is_active);

-- Insert default KPIs
INSERT OR IGNORE INTO analytics_kpis (
  id, kpi_name, kpi_category, display_name, description, unit,
  calculation_method, target_value, calculation_period, priority
) VALUES
  ('kpi_completion_rate', 'task_completion_rate', 'operational', 'Task Completion Rate', 'Percentage of tasks completed on time', 'percentage', 'COMPLETED_TASKS / TOTAL_TASKS * 100', 95.0, 'daily', 10),
  ('kpi_avg_completion_time', 'avg_completion_time', 'efficiency', 'Average Completion Time', 'Average time to complete interventions', 'hours', 'AVG(intervention_duration)', 4.0, 'daily', 9),
  ('kpi_client_satisfaction', 'client_satisfaction_score', 'client_satisfaction', 'Client Satisfaction', 'Average client satisfaction rating', 'rating', 'AVG(client_feedback_rating)', 4.5, 'weekly', 8),
  ('kpi_material_utilization', 'material_utilization_rate', 'efficiency', 'Material Utilization', 'Percentage of materials used vs ordered', 'percentage', 'USED_MATERIALS / ORDERED_MATERIALS * 100', 90.0, 'weekly', 7),
  ('kpi_revenue_per_hour', 'revenue_per_technician_hour', 'financial', 'Revenue per Hour', 'Average revenue generated per technician hour', 'currency', 'TOTAL_REVENUE / TOTAL_TECHNICIAN_HOURS', NULL, 'weekly', 6),
  ('kpi_quality_score', 'overall_quality_score', 'quality', 'Quality Score', 'Overall quality compliance score', 'percentage', 'QUALITY_CHECKS_PASSED / TOTAL_CHECKS * 100', 98.0, 'daily', 10),
  ('kpi_inventory_turnover', 'inventory_turnover_rate', 'efficiency', 'Inventory Turnover', 'How often inventory is sold/replaced', 'count', 'COGS / AVERAGE_INVENTORY', 12.0, 'monthly', 5),
  ('kpi_first_time_fix', 'first_time_fix_rate', 'efficiency', 'First Time Fix Rate', 'Percentage of interventions completed without revisit', 'percentage', 'SINGLE_VISIT_INTERVENTIONS / TOTAL_INTERVENTIONS * 100', 85.0, 'weekly', 7);