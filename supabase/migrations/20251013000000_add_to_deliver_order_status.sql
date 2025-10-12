-- Add 'to_deliver' status to order_status enum
-- Migration: Add To Deliver Status
-- Description: Add 'to_deliver' as a new order status option
-- Date: 2025-10-13

-- Add the new enum value
ALTER TYPE order_status ADD VALUE 'to_deliver';