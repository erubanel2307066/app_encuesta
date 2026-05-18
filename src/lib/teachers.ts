import { supabase } from './supabase';

export interface OfficialTeacher {
  nombre_oficial: string;
}

const TABLE_CANDIDATES = ['teachers', 'maestro', 'maestros'] as const;

/** Carga maestros oficiales probando tablas conocidas en Supabase */
export async function fetchOfficialTeachers(): Promise<OfficialTeacher[]> {
  for (const table of TABLE_CANDIDATES) {
    const { data, error } = await supabase.from(table).select('nombre_oficial');

    if (!error && data && data.length > 0) {
      return data.filter(t => t.nombre_oficial?.trim());
    }

    if (error) {
      console.warn(`fetchOfficialTeachers: tabla "${table}" —`, error.message);
    }
  }

  return [];
}
