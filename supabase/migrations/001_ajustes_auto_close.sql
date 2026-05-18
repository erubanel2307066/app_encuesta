-- =============================================================================
-- Sistema de cierre automático de votación
-- Ejecutar en Supabase → SQL Editor
-- =============================================================================

-- 1. Tabla ajustes (migra desde settings si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'settings'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ajustes'
  ) THEN
    ALTER TABLE public.settings RENAME TO ajustes;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ajustes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_enabled BOOLEAN NOT NULL DEFAULT true,
  closing_date DATE NOT NULL DEFAULT '2026-05-20',
  closing_time TIME NOT NULL DEFAULT '18:00:00',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ajustes
  ADD COLUMN IF NOT EXISTS closing_date DATE NOT NULL DEFAULT '2026-05-20',
  ADD COLUMN IF NOT EXISTS closing_time TIME NOT NULL DEFAULT '18:00:00';

-- Fila única de configuración
INSERT INTO public.ajustes (voting_enabled, closing_date, closing_time)
SELECT true, '2026-05-20'::date, '18:00:00'::time
WHERE NOT EXISTS (SELECT 1 FROM public.ajustes LIMIT 1);

-- 2. Función: timestamp de cierre (zona México)
CREATE OR REPLACE FUNCTION public.get_closing_timestamp()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT (
    (SELECT closing_date::text || ' ' || closing_time::text
     FROM public.ajustes
     ORDER BY updated_at DESC
     LIMIT 1)
  )::timestamp AT TIME ZONE 'America/Mexico_City';
$$;

-- 3. Función: cerrar votación si ya pasó la fecha/hora
CREATE OR REPLACE FUNCTION public.close_voting_if_expired()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ajustes%ROWTYPE;
  v_closing TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_row FROM public.ajustes ORDER BY updated_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF NOT v_row.voting_enabled THEN
    RETURN false;
  END IF;

  v_closing := public.get_closing_timestamp();

  IF now() >= v_closing THEN
    UPDATE public.ajustes
    SET voting_enabled = false, updated_at = now()
    WHERE id = v_row.id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 4. Trigger: bloquear INSERT de votos si votación cerrada
CREATE OR REPLACE FUNCTION public.enforce_voting_open()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  PERFORM public.close_voting_if_expired();

  SELECT voting_enabled INTO v_enabled
  FROM public.ajustes
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_enabled IS NOT TRUE THEN
    RAISE EXCEPTION 'VOTING_CLOSED'
      USING ERRCODE = 'P0001',
            HINT = 'La votación está cerrada. No se aceptan nuevos votos.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_voting_open ON public.teacher_votes;
CREATE TRIGGER trg_enforce_voting_open
  BEFORE INSERT ON public.teacher_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_voting_open();

-- 5. RLS (refuerzo adicional en servidor)
ALTER TABLE public.ajustes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ajustes_select_public" ON public.ajustes;
CREATE POLICY "ajustes_select_public"
  ON public.ajustes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "ajustes_update_authenticated" ON public.ajustes;
CREATE POLICY "ajustes_update_authenticated"
  ON public.ajustes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "votes_select_public" ON public.teacher_votes;
CREATE POLICY "votes_select_public"
  ON public.teacher_votes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "votes_insert_when_open" ON public.teacher_votes;
CREATE POLICY "votes_insert_when_open"
  ON public.teacher_votes FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (SELECT voting_enabled FROM public.ajustes ORDER BY updated_at DESC LIMIT 1) = true
    AND now() < public.get_closing_timestamp()
  );

-- 6. Realtime para ajustes (ignorar si ya está en la publicación)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ajustes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 7. Permisos RPC
GRANT EXECUTE ON FUNCTION public.close_voting_if_expired() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_closing_timestamp() TO anon, authenticated;
