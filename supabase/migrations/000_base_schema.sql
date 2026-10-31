-- =============================================================================
-- Esquema base: teachers, teacher_votes y category_winners
-- (001_ajustes_auto_close.sql depende de que teacher_votes exista)
-- =============================================================================

-- 1. Catálogo de maestros oficiales (autocompletado de la app)
CREATE TABLE IF NOT EXISTS public.teachers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre_oficial TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS teachers_nombre_oficial_key
  ON public.teachers (lower(nombre_oficial));

-- RLS abierto para búsqueda pública
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teachers_select_public" ON public.teachers;
CREATE POLICY "teachers_select_public"
  ON public.teachers FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Tabla de votos
--    columnas usadas en la app: teacher_name, maestro_oficial, category_id,
--    reason, device_fingerprint
CREATE TABLE IF NOT EXISTS public.teacher_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_name TEXT NOT NULL,
  maestro_oficial TEXT,
  category_id TEXT NOT NULL,
  reason TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un voto por dispositivo
CREATE UNIQUE INDEX IF NOT EXISTS teacher_votes_fingerprint_key
  ON public.teacher_votes (device_fingerprint);

ALTER TABLE public.teacher_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "votes_select_public" ON public.teacher_votes;
CREATE POLICY "votes_select_public"
  ON public.teacher_votes FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Ganadores por categoría (vista: maestro oficial más votado)
CREATE OR REPLACE VIEW public.category_winners AS
WITH conteos AS (
  SELECT category_id, maestro_oficial, count(*) AS votos
  FROM public.teacher_votes
  WHERE maestro_oficial IS NOT NULL AND maestro_oficial <> ''
  GROUP BY category_id, maestro_oficial
),
ranked AS (
  SELECT category_id, maestro_oficial, votos,
         row_number() OVER (
           PARTITION BY category_id
           ORDER BY votos DESC, maestro_oficial ASC
         ) AS posicion
  FROM conteos
)
SELECT category_id, maestro_oficial
FROM ranked
WHERE posicion = 1;
