CREATE TABLE public.enrichment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  product_name text,
  brand text,
  barcode text,
  ingredient_text_raw text,
  confidence text,
  image_size_bytes integer,
  processing_status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.enrichment_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts on enrichment_queue"
  ON public.enrichment_queue FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow reads on enrichment_queue"
  ON public.enrichment_queue FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow updates on enrichment_queue"
  ON public.enrichment_queue FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);