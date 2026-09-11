export function formatDuration(startedAt: string, now = Date.now()): string {
  const elapsedMinutes = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000));
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatViewerCount(count: number, locale = 'en'): string {
  return new Intl.NumberFormat(locale).format(count);
}
