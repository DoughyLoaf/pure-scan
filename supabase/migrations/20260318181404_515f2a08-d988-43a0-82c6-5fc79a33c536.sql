
-- Add new columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS front_image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients_image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS data_confidence TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT true;

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to product-images bucket
CREATE POLICY "Allow public uploads to product-images" ON storage.objects
FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'product-images');

-- Allow public reads
CREATE POLICY "Allow public reads on product-images" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'product-images');
