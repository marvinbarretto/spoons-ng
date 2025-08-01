/**
 * Formats a date string into a human-readable relative time format
 * @param dateString - ISO date string
 * @returns Human-readable relative time (e.g., "Today", "2 days ago", "3 weeks ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  
  return date.toLocaleDateString();
}

/**
 * Formats last active time with specific context
 * @param lastActiveString - ISO date string of last activity
 * @returns Formatted string with "Last active: " prefix context
 */
export function formatLastActive(lastActiveString: string): string {
  return formatRelativeTime(lastActiveString);
}