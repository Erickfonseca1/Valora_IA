-- Keep dashboard month/day boundaries aligned with the user's Brasília calendar.
ALTER FUNCTION public.get_dashboard_metrics()
  SET timezone = 'America/Sao_Paulo';
