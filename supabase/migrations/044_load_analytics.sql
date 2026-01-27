-- Migration: Load Analytics
-- Purpose: Materialized views and indexes for fast load planner analytics dashboards
-- Date: 2026-01-26

-- ============================================================================
-- Materialized View: load_analytics_mv
-- Aggregates load_history data by month, week, lane, equipment, carrier
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS load_analytics_mv AS
SELECT
    DATE_TRUNC('month', pickup_date) AS month,
    DATE_TRUNC('week', pickup_date) AS week,
    origin_state,
    destination_state,
    equipment_type_used,
    carrier_id,
    COUNT(*) AS load_count,
    SUM(customer_rate_cents) AS total_revenue_cents,
    SUM(carrier_rate_cents) AS total_carrier_cost_cents,
    SUM(margin_cents) AS total_margin_cents,
    AVG(margin_percentage) AS avg_margin_percentage,
    AVG(rate_per_mile_customer_cents) AS avg_rate_per_mile_cents,
    SUM(total_miles) AS total_miles,
    SUM(CASE WHEN is_oversize THEN 1 ELSE 0 END) AS oversize_count,
    SUM(CASE WHEN is_overweight THEN 1 ELSE 0 END) AS overweight_count,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
FROM load_history
WHERE pickup_date IS NOT NULL
GROUP BY
    DATE_TRUNC('month', pickup_date),
    DATE_TRUNC('week', pickup_date),
    origin_state,
    destination_state,
    equipment_type_used,
    carrier_id;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_load_analytics_unique
ON load_analytics_mv (
    month,
    week,
    origin_state,
    destination_state,
    COALESCE(equipment_type_used, ''),
    COALESCE(carrier_id::text, '')
);

-- Additional indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_load_analytics_month ON load_analytics_mv (month DESC);
CREATE INDEX IF NOT EXISTS idx_load_analytics_week ON load_analytics_mv (week DESC);
CREATE INDEX IF NOT EXISTS idx_load_analytics_lane ON load_analytics_mv (origin_state, destination_state);
CREATE INDEX IF NOT EXISTS idx_load_analytics_equipment ON load_analytics_mv (equipment_type_used);
CREATE INDEX IF NOT EXISTS idx_load_analytics_carrier ON load_analytics_mv (carrier_id);

-- ============================================================================
-- Table: load_daily_stats
-- Pre-computed daily aggregations for fast trend queries
-- ============================================================================

CREATE TABLE IF NOT EXISTS load_daily_stats (
    stat_date DATE PRIMARY KEY,
    load_count INTEGER NOT NULL DEFAULT 0,
    total_revenue_cents BIGINT NOT NULL DEFAULT 0,
    total_carrier_cost_cents BIGINT NOT NULL DEFAULT 0,
    total_margin_cents BIGINT NOT NULL DEFAULT 0,
    avg_margin_percentage DECIMAL(5,2),
    total_miles INTEGER NOT NULL DEFAULT 0,
    booked_count INTEGER NOT NULL DEFAULT 0,
    in_transit_count INTEGER NOT NULL DEFAULT 0,
    completed_count INTEGER NOT NULL DEFAULT 0,
    cancelled_count INTEGER NOT NULL DEFAULT 0,
    oversize_count INTEGER NOT NULL DEFAULT 0,
    overweight_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE load_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated" ON load_daily_stats
    FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- Function: refresh_daily_load_stats
-- Refreshes stats for a specific date
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_daily_load_stats(target_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO load_daily_stats (
        stat_date,
        load_count,
        total_revenue_cents,
        total_carrier_cost_cents,
        total_margin_cents,
        avg_margin_percentage,
        total_miles,
        booked_count,
        in_transit_count,
        completed_count,
        cancelled_count,
        oversize_count,
        overweight_count
    )
    SELECT
        target_date,
        COUNT(*),
        COALESCE(SUM(customer_rate_cents), 0),
        COALESCE(SUM(carrier_rate_cents), 0),
        COALESCE(SUM(margin_cents), 0),
        AVG(margin_percentage),
        COALESCE(SUM(total_miles), 0),
        COUNT(*) FILTER (WHERE status = 'booked'),
        COUNT(*) FILTER (WHERE status = 'in_transit'),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        COUNT(*) FILTER (WHERE is_oversize = true),
        COUNT(*) FILTER (WHERE is_overweight = true)
    FROM load_history
    WHERE pickup_date = target_date
    ON CONFLICT (stat_date) DO UPDATE SET
        load_count = EXCLUDED.load_count,
        total_revenue_cents = EXCLUDED.total_revenue_cents,
        total_carrier_cost_cents = EXCLUDED.total_carrier_cost_cents,
        total_margin_cents = EXCLUDED.total_margin_cents,
        avg_margin_percentage = EXCLUDED.avg_margin_percentage,
        total_miles = EXCLUDED.total_miles,
        booked_count = EXCLUDED.booked_count,
        in_transit_count = EXCLUDED.in_transit_count,
        completed_count = EXCLUDED.completed_count,
        cancelled_count = EXCLUDED.cancelled_count,
        oversize_count = EXCLUDED.oversize_count,
        overweight_count = EXCLUDED.overweight_count,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: refresh_load_analytics
-- Refreshes the materialized view
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_load_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY load_analytics_mv;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: backfill_daily_load_stats
-- Backfills historical daily stats
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_daily_load_stats()
RETURNS void AS $$
DECLARE
    target_date DATE;
BEGIN
    FOR target_date IN
        SELECT DISTINCT pickup_date
        FROM load_history
        WHERE pickup_date IS NOT NULL
        ORDER BY pickup_date
    LOOP
        PERFORM refresh_daily_load_stats(target_date);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Additional indexes on load_history for analytics queries
-- ============================================================================

-- Composite index for lane + date queries
CREATE INDEX IF NOT EXISTS idx_lh_lane_date
ON load_history (origin_state, destination_state, pickup_date DESC);

-- Index for equipment type with date
CREATE INDEX IF NOT EXISTS idx_lh_equipment_date
ON load_history (equipment_type_used, pickup_date DESC)
WHERE equipment_type_used IS NOT NULL;

-- Index for pickup_date to support month/week aggregations
CREATE INDEX IF NOT EXISTS idx_lh_pickup_date
ON load_history (pickup_date DESC)
WHERE pickup_date IS NOT NULL;

-- ============================================================================
-- Trigger: Auto-refresh daily stats when load_history changes
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_refresh_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.pickup_date IS NOT NULL THEN
            PERFORM refresh_daily_load_stats(OLD.pickup_date);
        END IF;
        RETURN OLD;
    ELSE
        IF NEW.pickup_date IS NOT NULL THEN
            PERFORM refresh_daily_load_stats(NEW.pickup_date);
        END IF;
        -- Also refresh old date if pickup_date changed
        IF TG_OP = 'UPDATE' AND OLD.pickup_date IS NOT NULL AND OLD.pickup_date != NEW.pickup_date THEN
            PERFORM refresh_daily_load_stats(OLD.pickup_date);
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER load_history_refresh_daily_stats
    AFTER INSERT OR UPDATE OR DELETE ON load_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_daily_stats();

-- ============================================================================
-- Initial data population
-- ============================================================================

-- Backfill daily stats from existing data
SELECT backfill_daily_load_stats();

-- Initial refresh of materialized view
SELECT refresh_load_analytics();
