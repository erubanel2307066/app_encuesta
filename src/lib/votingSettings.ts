export const VOTING_TIMEZONE = 'America/Mexico_City';

export const DEFAULT_CLOSING_DATE = '2026-05-20';
export const DEFAULT_CLOSING_TIME = '18:00:00';

export interface AjustesVotacion {
  id: string;
  voting_enabled: boolean;
  closing_date: string;
  closing_time: string;
  updated_at?: string;
}

function parseDateParts(closingDate: string) {
  const dateOnly = closingDate.split('T')[0];
  const [y, m, d] = dateOnly.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function parseTimeParts(closingTime?: string | null) {
  const match = (closingTime ?? DEFAULT_CLOSING_TIME).match(/(\d{1,2}):(\d{2})/);
  if (!match) return { hh: 18, mm: 0 };
  return { hh: Number(match[1]), mm: Number(match[2]) };
}

/** Instante UTC equivalente a closing_date + closing_time en zona México */
export function parseClosingDateTime(
  closingDate?: string | null,
  closingTime?: string | null
): Date | null {
  if (!closingDate) return null;

  const dateParts = parseDateParts(closingDate);
  if (!dateParts) return null;

  const { y, m, d } = dateParts;
  const { hh, mm } = parseTimeParts(closingTime);

  for (let offsetHours = -14; offsetHours <= 14; offsetHours++) {
    const candidate = new Date(Date.UTC(y, m - 1, d, hh - offsetHours, mm, 0));
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: VOTING_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
        .formatToParts(candidate)
        .map(p => [p.type, p.value])
    );

    const hour = Number(parts.hour) % 24;
    if (
      Number(parts.year) === y &&
      Number(parts.month) === m &&
      Number(parts.day) === d &&
      hour === hh &&
      Number(parts.minute) === mm
    ) {
      return candidate;
    }
  }

  const fallback = new Date(`${closingDate.split('T')[0]}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00-06:00`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function isPastClosing(closingAt: Date | null): boolean {
  if (!closingAt || Number.isNaN(closingAt.getTime())) return false;
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
  return closingDate?.split('T')[0] ?? DEFAULT_CLOSING_DATE;
}

export function formatTimeForInput(closingTime?: string | null): string {
  return (closingTime ?? DEFAULT_CLOSING_TIME).slice(0, 5);
}
