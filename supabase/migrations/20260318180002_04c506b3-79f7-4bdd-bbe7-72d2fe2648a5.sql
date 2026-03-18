
-- LAYER 1: Enhanced products table (add new columns only)
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients_hash TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS enrichment_source TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS score_override INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS score_override_reason TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS score_override_by TEXT;

-- LAYER 3: Reformulation tracking
CREATE TABLE IF NOT EXISTS reformulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  barcode TEXT NOT NULL,
  product_name TEXT,
  old_ingredients TEXT,
  new_ingredients TEXT,
  old_score INTEGER,
  new_score INTEGER,
  score_delta INTEGER,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  notification_sent BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_reformulations_product ON reformulations(product_id);
CREATE INDEX IF NOT EXISTS idx_reformulations_detected ON reformulations(detected_at);
ALTER TABLE reformulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous select on reformulations" ON reformulations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anonymous inserts on reformulations" ON reformulations FOR INSERT TO anon, authenticated WITH CHECK (true);

-- LAYER 4: Ingredient graph
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  category TEXT,
  risk_level TEXT,
  score_penalty INTEGER DEFAULT 0,
  description TEXT,
  why_flagged TEXT,
  regulatory_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous select on ingredients" ON ingredients FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anonymous inserts on ingredients" ON ingredients FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Scan-level geography tagging
ALTER TABLE scans ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS lat DECIMAL(10,8);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS lng DECIMAL(11,8);

-- LAYER 2: Add missing columns to existing enrichment_queue
ALTER TABLE enrichment_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE enrichment_queue ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ;
ALTER TABLE enrichment_queue ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
ALTER TABLE enrichment_queue ADD COLUMN IF NOT EXISTS error_message TEXT;
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_status ON enrichment_queue(processing_status);

-- Analytics view (corrected column names)
CREATE OR REPLACE VIEW admin_scan_stats AS
SELECT 
  p.barcode,
  p.product_name,
  p.brand,
  p.pure_score,
  COUNT(s.id) as total_scans,
  COUNT(DISTINCT s.session_id) as unique_scanners,
  MAX(s.created_at) as last_scanned,
  p.enrichment_source,
  p.last_enriched_at
FROM products p
LEFT JOIN scans s ON s.barcode = p.barcode
GROUP BY p.id, p.barcode, p.product_name, p.brand, p.pure_score, p.enrichment_source, p.last_enriched_at
ORDER BY total_scans DESC;
