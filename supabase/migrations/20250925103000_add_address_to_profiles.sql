-- Add address fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN street_address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN zip_code TEXT,
ADD COLUMN country TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.street_address IS 'Street address of the user';
COMMENT ON COLUMN public.profiles.city IS 'City of the user';
COMMENT ON COLUMN public.profiles.state IS 'State or province of the user';
COMMENT ON COLUMN public.profiles.zip_code IS 'ZIP or postal code of the user';
COMMENT ON COLUMN public.profiles.country IS 'Country of the user';