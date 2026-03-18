
-- Products master table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text UNIQUE NOT NULL,
  product_name text NOT NULL,
  brand text,
  pure_score integer,
  ingredients_raw text,
  flagged_count integer DEFAULT 0,
  flagged_categories text[],
  flagged_ingredients text[],
  categories_raw text,
  image_url text,
  is_water boolean DEFAULT false,
  water_brand text,
  scan_count integer DEFAULT 1,
  first_scanned_at timestamptz DEFAULT now(),
  last_scanned_at timestamptz DEFAULT now(),
  data_source text DEFAULT 'open_food_facts',
  manually_verified boolean DEFAULT false,
  user_submitted boolean DEFAULT false,
  country_code text DEFAULT 'us',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_brand ON public.products(brand);
CREATE INDEX idx_products_pure_score ON public.products(pure_score);
CREATE INDEX idx_products_scan_count ON public.products(scan_count DESC);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous inserts on products" ON public.products FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anonymous updates on products" ON public.products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow reads on products" ON public.products FOR SELECT TO anon, authenticated USING (true);

-- Product submissions table
CREATE TABLE public.product_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  session_id text NOT NULL,
  barcode text NOT NULL,
  product_name text,
  brand text,
  ingredients_raw text,
  image_url text,
  status text DEFAULT 'pending',
  notes text
);
ALTER TABLE public.product_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous inserts on submissions" ON public.product_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow reads on submissions" ON public.product_submissions FOR SELECT TO anon, authenticated USING (true);

-- Brand intelligence table
CREATE TABLE public.brand_stats (
  brand text PRIMARY KEY,
  total_scans integer DEFAULT 0,
  avg_pure_score numeric(5,2),
  total_products integer DEFAULT 0,
  most_common_flag text,
  last_updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.brand_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow reads on brand_stats" ON public.brand_stats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow inserts on brand_stats" ON public.brand_stats FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow updates on brand_stats" ON public.brand_stats FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Ingredient intelligence table
CREATE TABLE public.ingredient_stats (
  ingredient_name text PRIMARY KEY,
  total_occurrences integer DEFAULT 0,
  unique_products integer DEFAULT 0,
  category text,
  last_seen_at timestamptz DEFAULT now()
);
ALTER TABLE public.ingredient_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow reads on ingredient_stats" ON public.ingredient_stats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all on ingredient_stats" ON public.ingredient_stats FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Upsert product function
CREATE OR REPLACE FUNCTION public.upsert_product(
  p_barcode text,
  p_product_name text,
  p_brand text,
  p_pure_score integer,
  p_ingredients_raw text,
  p_flagged_count integer,
  p_flagged_categories text[],
  p_flagged_ingredients text[],
  p_categories_raw text,
  p_image_url text,
  p_is_water boolean,
  p_water_brand text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.products (
    barcode, product_name, brand, pure_score, ingredients_raw,
    flagged_count, flagged_categories, flagged_ingredients,
    categories_raw, image_url, is_water, water_brand, scan_count,
    first_scanned_at, last_scanned_at
  ) VALUES (
    p_barcode, p_product_name, p_brand, p_pure_score, p_ingredients_raw,
    p_flagged_count, p_flagged_categories, p_flagged_ingredients,
    p_categories_raw, p_image_url, p_is_water, p_water_brand, 1,
    now(), now()
  )
  ON CONFLICT (barcode) DO UPDATE SET
    scan_count = products.scan_count + 1,
    last_scanned_at = now(),
    pure_score = EXCLUDED.pure_score,
    ingredients_raw = COALESCE(EXCLUDED.ingredients_raw, products.ingredients_raw),
    image_url = COALESCE(EXCLUDED.image_url, products.image_url),
    updated_at = now();
END;
$$;

-- Update brand stats function
CREATE OR REPLACE FUNCTION public.update_brand_stats(p_brand text, p_score integer, p_flag text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.brand_stats (brand, total_scans, avg_pure_score, total_products, most_common_flag)
  VALUES (p_brand, 1, p_score, 1, p_flag)
  ON CONFLICT (brand) DO UPDATE SET
    total_scans = brand_stats.total_scans + 1,
    avg_pure_score = ((brand_stats.avg_pure_score * brand_stats.total_scans) + p_score) / (brand_stats.total_scans + 1),
    last_updated_at = now();
END;
$$;

-- Increment ingredient function
CREATE OR REPLACE FUNCTION public.increment_ingredient(p_name text, p_category text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.ingredient_stats (ingredient_name, total_occurrences, unique_products, category)
  VALUES (p_name, 1, 1, p_category)
  ON CONFLICT (ingredient_name) DO UPDATE SET
    total_occurrences = ingredient_stats.total_occurrences + 1,
    last_seen_at = now();
END;
$$;
