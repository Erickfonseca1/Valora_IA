-- 006_dashboard_metrics.sql
-- Aggregates all dashboard metrics in a single round trip (RPC).
-- Returns jsonb:
--   valuations_this_month, valuations_prev_month, avg_confidence,
--   market_temperature, market_city, valuations_per_day [{date, count}]
--
-- Run manually in the Supabase SQL editor (see CLAUDE.md).

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET timezone = 'America/Sao_Paulo'
AS $$
  SELECT jsonb_build_object(
    'valuations_this_month', COALESCE((
      SELECT count(*) FROM valuations
      WHERE created_at >= date_trunc('month', now())
    ), 0),
    'valuations_prev_month', COALESCE((
      SELECT count(*) FROM valuations
      WHERE created_at >= date_trunc('month', now()) - interval '1 month'
        AND created_at < date_trunc('month', now())
    ), 0),
    'avg_confidence', COALESCE((
      SELECT ROUND(avg(confidence_score), 1) FROM valuations
      WHERE created_at >= date_trunc('month', now())
    ), 0),
    'market_temperature', CASE
      WHEN (SELECT count(*) FROM listings WHERE last_seen >= now() - interval '30 days')::numeric
           / NULLIF((SELECT count(*) FROM listings
                     WHERE last_seen >= now() - interval '60 days'
                       AND last_seen < now() - interval '30 days'), 0) >= 1.2 THEN 'hot'
      WHEN (SELECT count(*) FROM listings WHERE last_seen >= now() - interval '30 days')::numeric
           / NULLIF((SELECT count(*) FROM listings
                     WHERE last_seen >= now() - interval '60 days'
                       AND last_seen < now() - interval '30 days'), 0) <= 0.8 THEN 'cold'
      ELSE 'warm'
    END,
    'market_city', COALESCE((
      SELECT city FROM listings
      WHERE city IS NOT NULL
      GROUP BY city
      ORDER BY count(*) DESC, max(last_seen) DESC NULLS LAST
      LIMIT 1
    ), 'N/A'),
    'valuations_per_day', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'date', to_char(d, 'YYYY-MM-DD'),
        'count', (SELECT count(*) FROM valuations v
                  WHERE v.created_at >= d AND v.created_at < d + interval '1 day')
      ))
      FROM generate_series(
        date_trunc('day', now()) - interval '29 days',
        date_trunc('day', now()),
        interval '1 day'
      ) AS d
    ), '[]'::jsonb)
  );
$$;
