-- =============================================================================
-- Datos de prueba para el entorno LOCAL
-- (no ejecutar contra el proyecto de producción)
-- =============================================================================

-- Hora de cierre en el futuro para poder votar hoy
-- (el default de 001 es 2026-05-20 y «ceraría» la votación de inmediato)
INSERT INTO public.ajustes (voting_enabled, closing_date, closing_time)
SELECT true, (current_date + interval '1 year')::date, '23:59:00'
WHERE NOT EXISTS (SELECT 1 FROM public.ajustes LIMIT 1);

UPDATE public.ajustes
SET voting_enabled = true,
    closing_date = (current_date + interval '1 year')::date,
    closing_time = '23:59:00',
    updated_at = now();

-- Catálogo de maestros oficials de ejemplo
INSERT INTO public.teachers (nombre_oficial)
VALUES
  ('Mtro. Juan Pérez García'),
  ('Mtra. María López Sánchez'),
  ('Mtro. Carlos Ramírez Torres'),
  ('Mtra. Ana Flores Méndez'),
  ('Mtro. Luis Hernández Ruiz'),
  ('Mtra. Sofía Castillo Vargas')
ON CONFLICT DO NOTHING;

-- Aliases alternativos por si se buscan sin prefijo
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Votos de ejemplo (fingerprints únicos ficticios)
INSERT INTO public.teacher_votes (teacher_name, maestro_oficial, category_id, reason, device_fingerprint)
VALUES
  ('Juan Pérez García', 'Mtro. Juan Pérez García', 'best', 'Siempre está atento a sus alumnos.', 'seed-fp-1'),
  ('María López Sánchez', 'Mtra. María López Sánchez', 'fun', 'Sus clases son lo más divertido del semestre.', 'seed-fp-2'),
  ('Carlos Ramírez', 'Mtro. Carlos Ramírez Torres', 'explains', 'Explica hasta el tema más difícil de forma simple.', 'seed-fp-3'),
  ('Ana Flores', 'Mtra. Ana Flores Méndez', 'inspiring', 'Me motivó a seguir estudiando.', 'seed-fp-4'),
  ('Luis Hernández', 'Mtro. Luis Hernández Ruiz', 'strict', 'Estricto pero siempre justo.', 'seed-fp-5'),
  ('Sofía Castillo', 'Mtra. Sofía Castillo Vargas', 'best', 'La mejor de todas, sin duda.', 'seed-fp-6'),
  ('Juan Pérez García', 'Mtro. Juan Pérez García', 'explains', 'Dominio total del tema.', 'seed-fp-7'),
  ('María López Sánchez', 'Mtra. María López Sánchez', 'best', 'Tiene paciencia infinita.', 'seed-fp-8')
ON CONFLICT (device_fingerprint) DO NOTHING;
