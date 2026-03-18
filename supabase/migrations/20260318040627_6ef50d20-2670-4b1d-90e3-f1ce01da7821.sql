
-- Table: sessions
CREATE TABLE public.sessions (
  session_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  scan_count integer NOT NULL DEFAULT 0,
  total_ingredients_flagged integer NOT NULL DEFAULT 0,
  dietary_preferences text[],
  platform text
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts on sessions"
  ON public.sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anonymous updates on sessions"
  ON public.sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on sessions"
  ON public.sessions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Table: scans
CREATE TABLE public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  barcode text,
  product_name text,
  brand text,
  pure_score integer,
  categories_raw text,
  ingredients_raw text,
  flagged_count integer,
  flagged_categories text[],
  flagged_ingredients text[],
  is_water boolean DEFAULT false,
  water_brand text,
  app_version text,
  platform text
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts on scans"
  ON public.scans FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Table: alternative_taps
CREATE TABLE public.alternative_taps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  scanned_product_name text,
  scanned_product_score integer,
  alternative_name text,
  alternative_brand text,
  alternative_score integer,
  action text
);

ALTER TABLE public.alternative_taps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts on alternative_taps"
  ON public.alternative_taps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Table: unknown_barcodes
CREATE TABLE public.unknown_barcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  barcode text UNIQUE NOT NULL,
  scan_count integer NOT NULL DEFAULT 1,
  last_scanned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.unknown_barcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts on unknown_barcodes"
  ON public.unknown_barcodes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anonymous updates on unknown_barcodes"
  ON public.unknown_barcodes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
