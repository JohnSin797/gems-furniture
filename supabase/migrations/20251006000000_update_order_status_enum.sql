-- Update order_status enum to new values: pending, confirmed, cancelled, received
-- Migration: Update Order Status Enum
-- Description: Change order_status enum from 6 values to 4 values
-- Date: 2025-10-06

-- First, create a new enum with the desired values
CREATE TYPE order_status_new AS ENUM ('pending', 'confirmed', 'cancelled', 'received');

-- Update existing records to map old statuses to new ones
-- processing -> confirmed (still being processed, so confirmed)
-- shipped -> received (has been shipped, so received)
-- delivered -> received (already delivered, so received)
UPDATE public.orders
SET status = CASE
    WHEN status::text = 'processing' THEN 'confirmed'::order_status_new
    WHEN status::text = 'shipped' THEN 'received'::order_status_new
    WHEN status::text = 'delivered' THEN 'received'::order_status_new
    ELSE status::text::order_status_new
END;

-- Update the column to use the new enum
ALTER TABLE public.orders ALTER COLUMN status TYPE order_status_new USING status::text::order_status_new;

-- Drop the old enum
DROP TYPE order_status;

-- Rename the new enum to the original name
ALTER TYPE order_status_new RENAME TO order_status;