export function relativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1)
    return 'Just now';
  if (diffMinutes < 60)
    return `${diffMinutes} min ago`;
  if (diffHours < 24)
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  if (diffDays === 1)
    return 'Yesterday';
  if (diffDays < 7)
    return `${diffDays} days ago`;
  return date.toLocaleDateString();
}
