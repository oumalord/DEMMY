-- Alter visitor_passes table to match new requirements
-- Adding columns for visitor information and property/unit location details

ALTER TABLE visitor_passes 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS destination TEXT,
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id),
  ADD COLUMN IF NOT EXISTS floor TEXT,
  ADD COLUMN IF NOT EXISTS house_number TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Drop old unnecessary columns if they exist (optional - keep for backward compatibility)
-- ALTER TABLE visitor_passes DROP COLUMN expires_at;
-- ALTER TABLE visitor_passes DROP COLUMN checked_in_at;
-- ALTER TABLE visitor_passes DROP COLUMN checked_out_at;
