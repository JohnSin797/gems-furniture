-- Update address fields in profiles table for Philippine address format
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS country;

ALTER TABLE public.profiles
ADD COLUMN barangay TEXT,
ADD COLUMN province TEXT;

-- Update comments for documentation
COMMENT ON COLUMN public.profiles.street_address IS 'Street address of the user';
COMMENT ON COLUMN public.profiles.barangay IS 'Barangay of the user';
COMMENT ON COLUMN public.profiles.city IS 'City or municipality of the user';
COMMENT ON COLUMN public.profiles.province IS 'Province of the user';
COMMENT ON COLUMN public.profiles.zip_code IS 'ZIP code of the user';