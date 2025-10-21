/*
# [BACKFILL_TRIAL_SUBSCRIPTIONS]
[This script retroactively creates a 30-day trial subscription for any existing companies that do not have one.]

## Query Description: [This is a safe, one-time operation to fix data inconsistencies. It finds all companies in the `empresas` table that do not have a corresponding entry in the `subscriptions` table and inserts a new 'trialing' subscription for each of them. It will not affect companies that already have a subscription.]

## Metadata:
- Schema-Category: ["Data"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [false]

## Structure Details:
- Affects table: `public.subscriptions` (INSERT)
- Reads from tables: `public.empresas`, `public.subscriptions`

## Security Implications:
- RLS Status: [Not Applicable - Run by admin]
- Policy Changes: [No]
- Auth Requirements: [Admin privileges in Supabase dashboard]

## Performance Impact:
- Indexes: [Uses existing indexes]
- Triggers: [No]
- Estimated Impact: [Low, depends on the number of companies without subscriptions.]
*/
INSERT INTO public.subscriptions (empresa_id, status, current_period_end)
SELECT
  e.id,
  'trialing',
  now() + interval '30 days'
FROM
  public.empresas e
WHERE
  NOT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.empresa_id = e.id
  );
