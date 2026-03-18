
CREATE POLICY "Allow anonymous select on scans"
ON public.scans FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anonymous select on alternative_taps"
ON public.alternative_taps FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anonymous select on unknown_barcodes"
ON public.unknown_barcodes FOR SELECT
TO anon, authenticated
USING (true);
