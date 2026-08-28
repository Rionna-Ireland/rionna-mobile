/** "Sat 5 Sep, 11:00" — compact single-line card format (device locale). */
export function formatEventDate(startsAt: string | null): string | null {
  if (!startsAt)
    return null;
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime()))
    return null;
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Location line for cards/detail: address, else "Online", else "Location TBC". */
export function formatEventLocation(event: {
  locationType: string | null;
  inPersonLocation: string | null;
  virtualLocationUrl: string | null;
}): string {
  if (event.inPersonLocation)
    return event.inPersonLocation;
  if (event.locationType === 'virtual')
    return 'Online';
  return 'Location TBC';
}
