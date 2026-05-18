import { supabase } from './supabase';

export interface OfficialTeacher {
  nombre_oficial: string;
}

const TABLE_CANDIDATES = ['teachers', 'maestros', 'maestro'] as const;

/** Carga maestros oficiales probando tablas conocidas en Supabase */
export async function fetchOfficialTeachers(): Promise<OfficialTeacher[]> {
  for (const table of TABLE_CANDIDATES) {
    const { data, error } = await supabase.from(table).select('nombre_oficial');

    if (error) {
      console.warn(`fetchOfficialTeachers: tabla "${table}" —`, error.message);
      continue;
    }

    if (!data || data.length === 0) continue;

    const validTeachers = data
      .map((t) => ({ nombre_oficial: t.nombre_oficial?.trim() ?? '' }))
      .filter((t) => t.nombre_oficial.length > 0);

    if (validTeachers.length > 0) {
      const uniqueTeachers = Array.from(new Set(validTeachers.map((t) => t.nombre_oficial))).map((name) => ({ nombre_oficial: name }));
      return uniqueTeachers;
    }
  }

  return [];
}
