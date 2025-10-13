-- Add 'delivered' status to order_status enum
-- Migration: Add Delivered Status
-- Description: Add 'delivered' as a new order status option
-- Date: 2025-10-14

-- Add the new enum value
ALTER TYPE order_status ADD VALUE 'delivered';