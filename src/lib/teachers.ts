import { supabase } from './supabase';

export interface OfficialTeacher {
  id: number;
  officialName: string;
}

export async function searchOfficialTeachers(search: string, limit = 8): Promise<OfficialTeacher[]> {
  if (!search || !search.trim()) return [];

  const searchPattern = `%${search.trim()}%`;
  const { data, error } = await supabase
    .from('teachers')
    .select('id, nombre_oficial')
    .ilike('nombre_oficial', searchPattern)
    .limit(limit);

  if (error) {
    console.warn('searchOfficialTeachers error:', error.message);
    return [];
  }

  return (data ?? [])
    .map((t) => ({ id: t.id, officialName: t.nombre_oficial?.trim() || '' }))
    .filter((t) => t.officialName.length > 0);
}
