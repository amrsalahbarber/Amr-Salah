<!-- SUBSCRIPTION SYSTEM DOCUMENTATION & ROUTING RULES -->

# Multi-Tenant Subscription System - Complete Guide

## Subscription Statuses Explained:

### 1. **ACTIVE** ✅
- Subscription is currently valid
- subscription_status = 'active'
- subscription_end_date > current date
- User can access ALL features
- **Routing**: Shows dashboard normally

### 2. **INACTIVE** ⏸️
- Subscription hasn't started yet OR subscription was manually deactivated
- subscription_status = 'inactive'
- subscription_end_date may be in future or past
- User CAN view data but CANNOT make transactions
- **Routing**: Shows "Subscription Inactive" alert, can view billing page but blocked from POS
- **Action**: Admin must manually reactivate (change status to 'active')

### 3. **SUSPENDED** 🚫
- Payment issue OR quota exceeded (for quota plans)
- subscription_status = 'suspended'
- User CANNOT access any features
- **Routing**: Shows "Subscription Suspended" alert, redirects to billing page with warning
- **Action**: Admin can remove suspension (change status to 'active') OR user pays invoice

### 4. **EXPIRED** ⏰
- subscription_end_date < current date AND subscription_status = 'active'
- Subscription period ended but wasn't renewed
- User CANNOT access features
- **Routing**: Shows "Subscription Expired" alert, redirects to billing page
- **Action**: Admin extends subscription_end_date

## Routing Rules (Multi-Tenant):

### Shop Users:
- If status = 'inactive'  → Can view dashboard, but POS shows alert + "View Billing" button
- If status = 'suspended' → Redirected to ShopBilling page with prominent warning
- If status = 'expired'   → Redirected to ShopBilling page with renewal message
- If status = 'active' AND date valid → Full access to all features

### Admin Users:
- Can see all shops regardless of subscription status
- Can manually change subscription_status
- Can extend subscription_end_date
- Can manage plans and pricing

## Database Structure:

```
shops table:
- id (uuid)
- auth_user_id (uuid) - Links to Supabase Auth
- name (text)
- subscription_status (enum: active, inactive, suspended)
- subscription_end_date (date)
- plan_id (uuid) - Foreign key to plans table
- created_at (timestamp)

plans table:
- id (uuid)
- name (text)
- pricing_type (enum: per_transaction, per_service, quota)
- price_per_unit (numeric) - For per_transaction/per_service
- monthly_price (numeric) - For quota plans
- quota_limit (integer) - For quota plans

usage_logs table:
- shop_id (uuid)
- action_type (text)
- quantity (integer)
- billable_amount (numeric)
- year_month (text) - YYYY-MM format
```

## Key Implementation Points:

1. **Always filter by auth_user_id**: Every query for shops/settings must link through auth
2. **Check subscription status**: Before allowing transactions, verify status = 'active' AND date valid
3. **Use shop_id for multi-tenancy**: All tables that belong to shops must have shop_id column
4. **RLS Policies**: Database row-level security ensures shops can only see their own data
5. **Admin access**: Admin policies allow viewing all shops across all tenants
