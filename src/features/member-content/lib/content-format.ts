export function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export function safeExternalUrl(value: unknown): string | null {
  const text = nonEmptyString(value);
  if (!text)
    return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:' ? text : null;
  }
  catch {
    return null;
  }
}

export function formatCount(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function formatMemberContentDate(value: string | null): string | null {
  if (!value)
    return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    return null;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
