export const VOTING_TIMEZONE = 'America/Mexico_City';

export interface AjustesVotacion {
  id: string;
  voting_enabled: boolean;
  closing_date: string;
  closing_time: string;
  updated_at?: string;
}

/** Instante UTC equivalente a closing_date + closing_time en zona México */
export function parseClosingDateTime(
  closingDate?: string | null,
  closingTime?: string | null
): Date | null {
  if (!closingDate) return null;

  const timePart = (closingTime ?? '18:00:00').slice(0, 5);
  const [y, m, d] = closingDate.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);

  let utcMs = Date.UTC(y, m - 1, d, hh + 6, mm);

  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: VOTING_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(utcMs));

    const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
    const diffMin =
      (y - get('year')) * 525_600 +
      (m - get('month')) * 43_200 +
      (d - get('day')) * 1_440 +
      (hh - get('hour')) * 60 +
      (mm - get('minute'));

    if (diffMin === 0) return new Date(utcMs);
    utcMs += diffMin * 60_000;
  }

  return new Date(utcMs);
}

export function isPastClosing(closingAt: Date | null): boolean {
  if (!closingAt) return false;
  return Date.now() >= closingAt.getTime();
}

export function formatClosingDisplay(
  closingDate?: string | null,
  closingTime?: string | null
): string {
  const closingAt = parseClosingDateTime(closingDate, closingTime);
  if (!closingAt) return '—';
  return closingAt.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: VOTING_TIMEZONE,
  });
}

export function formatTimeDisplay(closingTime?: string | null): string {
  if (!closingTime) return '18:00';
  return closingTime.slice(0, 5);
}

export function formatDateForInput(closingDate?: string | null): string {
  return closingDate ?? '2026-05-20';
}

export function formatTimeForInput(closingTime?: string | null): string {
  return (closingTime ?? '18:00:00').slice(0, 5);
}
