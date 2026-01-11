export function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let [_, hh, mm, ap] = match;
  let h = parseInt(hh, 10) % 12;
  if (ap.toUpperCase() === 'PM') h += 12;
  return h * 60 + parseInt(mm, 10);
}

export function durationFromRange(start: string | null, end: string | null): number | null {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  if (s == null || e == null) return null;
  const diff = e - s;
  return diff > 0 ? diff : null;
}

export function classifyMeetingType(duration: number | null): 'LECTURE' | 'SECTION' | 'UNKNOWN' {
  if (duration == null) return 'UNKNOWN';
  if (duration >= 73 && duration <= 77) return 'LECTURE';
  if (duration >= 48 && duration <= 52) return 'SECTION';
  return 'UNKNOWN';
}
